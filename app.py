import os
import json
import google.generativeai as genai
from flask import Flask, request, jsonify
from flask_cors import CORS

# --- 1. 설정 ---
app = Flask(__name__)
CORS(app)

# GOOGLE_API_KEY = "AIzaSyBZM_8jC-dk7nHK3RHsinC8nZx5ALh7gk0" # 이 줄 대신
# GOOGLE_API_KEY = "AIzaSyBZM_8jC-dk7nHK3RHsinC8nZx5ALh7gk0" #
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY") # 환경 변수에서 가져오기

if not GOOGLE_API_KEY:
    print("CRITICAL: GOOGLE_API_KEY 환경 변수가 설정되지 않았습니다. 앱이 정상적으로 작동하지 않을 수 있습니다.")
    # 또는 raise ValueError("GOOGLE_API_KEY 환경 변수가 설정되지 않았습니다.") 로 앱 시작 중단
else:
    try:
        genai.configure(api_key=GOOGLE_API_KEY)
        print("Gemini API Key configured successfully.")
    except Exception as e:
        print(f"CRITICAL: Gemini API Key 구성 중 오류 발생: {e}")
        # 이 경우에도 앱이 정상 작동하지 않을 가능성이 높음


# --- 2. AI 통합 분석 함수 (모든 것을 한 번에 처리!) ---
def get_ai_complete_report(daily_log):
    model = genai.GenerativeModel('gemini-1.5-flash-latest', generation_config={"response_mime_type": "application/json"})
    
    # AI에게 전달할 모든 정보
    tdee = calculate_tdee_for_prompt(daily_log['user_info']) # 프롬프트용 TDEE 계산
    total_exercise = daily_log['strength_minutes'] + daily_log['cardio_minutes']
    
    prompt = f"""
    당신은 사용자의 하루 건강 기록을 종합적으로 분석하여 점수와 맞춤형 피드백을 제공하는 전문 헬스케어 AI 어드바이저입니다.

    [사용자 데이터]
    - 수면 시간: {daily_log['sleep_hours']:.1f} 시간
    - 섭취 칼로리: {daily_log['calories']} kcal (권장: 약 {tdee} kcal)
    - 총 운동 시간: {total_exercise} 분 (목표: 60분)
    - 감정 기록: "{daily_log['mood_text']}"

    [생성할 JSON 객체]
    위 모든 데이터를 종합적으로 고려하여, 아래 7가지 항목을 포함하는 JSON 객체를 생성해주세요.

    1.  "holistic_health_score" (number): 모든 요소를 종합하여 판단한 오늘의 최종 건강 점수를 0점에서 100점 사이의 정수로 '직접 산출'해주세요. (예: 운동을 많이 했지만 스트레스가 높으면 점수를 조정)
    2.  "score_reason" (string): 위 점수를 산출한 핵심적인 이유를 한 문장으로 간결하게 설명해주세요.
    3.  "stress_score" (number): 감정 기록을 분석한 스트레스 지수를 0(긍정)에서 100(부정) 사이의 정수로 산출해주세요.
    4.  "mental_summary" (string): 감정 상태를 요약해주세요 (1-2문장).
    5.  "mental_feedback" (string): 감정에 대한 공감과 조언을 담은 피드백을 주세요 (1-2문장).
    6.  "physical_summary" (string): 신체 활동(수면,식사,운동)을 객관적으로 요약해주세요. 잘한 점과 아쉬운 점을 수치를 들어 설명해주세요 (1-2문장).
    7.  "physical_feedback" (string): 가장 개선이 필요한 신체 활동에 대한 구체적이고 실천 가능한 팁을 제안해주세요 (1-2문장).
    """
    try:
        response = model.generate_content(prompt)
        return json.loads(response.text)
    except Exception as e:
        print(f"Gemini 통합 분석 오류: {e}")
        return {
            "holistic_health_score": 50,
            "score_reason": "AI 분석 중 오류가 발생하여 기본 점수가 표시됩니다.",
            "stress_score": 50,
            "mental_summary": "오류 발생", "mental_feedback": "오류 발생",
            "physical_summary": "오류 발생", "physical_feedback": "오류 발생"
        }

# 프롬프트에만 사용할 간단한 TDEE 계산 함수
def calculate_tdee_for_prompt(user_info):
    gender = user_info.get('gender', 'female')
    weight_kg = user_info.get('weight_kg', 55)
    height_cm = user_info.get('height_cm', 160)
    age = user_info.get('age', 30)
    if gender.lower() == 'male':
        bmr = 88.362 + (13.397 * weight_kg) + (4.799 * height_cm) - (5.677 * age)
    else:
        bmr = 447.593 + (9.247 * weight_kg) + (3.098 * height_cm) - (4.330 * age)
    return int(bmr * 1.375)

# --- 3. 메인 API 엔드포인트 ---
@app.route('/api/health-report', methods=['POST'])
def create_ai_driven_report():
    data = request.json
    full_daily_log = {**data.get('dailyLog', {}), 'user_info': data.get('userInfo', {})}
    
    ai_result = get_ai_complete_report(full_daily_log)
    
    report = {
        "todayHealthScore": ai_result.get('holistic_health_score'),
        "scoreReason": ai_result.get('score_reason'),
        "aiMentalAnalysis": {
            "summary": ai_result.get('mental_summary'),
            "feedback": ai_result.get('mental_feedback'),
            "stress_score": ai_result.get('stress_score')
        },
        "aiPhysicalAnalysis": {
            "summary": ai_result.get('physical_summary'),
            "feedback": ai_result.get('physical_feedback')
        }
    }
    return jsonify(report)
    def home():
    return "Flask API 서버가 정상적으로 실행 중입니다. API 엔드포인트는 /api/health-report 입니다."

if __name__ == '__main__':
    # 로컬 개발 시에만 사용. Render에서는 Gunicorn이 실행하므로 이 부분은 실행되지 않음.
    # Render는 PORT 환경 변수를 통해 동적으로 포트를 할당하므로, 여기서 포트를 고정할 필요 없음.
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5001)), debug=True)
