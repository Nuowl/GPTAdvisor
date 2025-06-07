import os
import json
import google.generativeai as genai
from flask import Flask, request, jsonify
from flask_cors import CORS

# --- 1. 설정 ---
app = Flask(__name__)
# 실제 배포 시에는 특정 오리진(GitHub Pages URL)을 지정하는 것이 좋습니다.
# 예: CORS(app, resources={r"/api/*": {"origins": "https://nuowl.github.io"}})
CORS(app) 

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    print("CRITICAL: GOOGLE_API_KEY 환경 변수가 설정되지 않았습니다. 앱이 정상적으로 작동하지 않을 수 있습니다.")
    # 실제 운영 환경에서는 여기서 앱 실행을 중단시키는 것이 안전할 수 있습니다.
    # raise ValueError("GOOGLE_API_KEY 환경 변수가 설정되지 않았습니다.") 
else:
    try:
        genai.configure(api_key=GOOGLE_API_KEY)
        print("Gemini API Key configured successfully.")
    except Exception as e:
        print(f"CRITICAL: Gemini API Key 구성 중 오류 발생: {e}")
        # 이 경우에도 앱이 정상 작동하지 않을 가능성이 높습니다.

# --- 2. AI 통합 분석 함수 (모든 것을 한 번에 처리!) ---
def get_ai_complete_report(daily_log):
    # 모델 초기화는 한 번만 하는 것이 효율적일 수 있으나, 요청마다 해도 큰 문제는 없음
    model = genai.GenerativeModel(
        'gemini-1.5-flash-latest',
        generation_config={"response_mime_type": "application/json"}
    )
    
    # 사용자 정보에서 값 가져오기 (기본값 설정 포함)
    user_info = daily_log.get('user_info', {})
    user_age = user_info.get('age', '정보 없음')
    user_gender = user_info.get('gender', '정보 없음')
    user_height = user_info.get('height_cm', '정보 없음')
    user_weight = user_info.get('weight_kg', '정보 없음')
    
    tdee = calculate_tdee_for_prompt(user_info) 
    
    # dailyLog에서 값 가져오기 (키 존재 여부 및 타입 확인 강화)
    sleep_hours_val = daily_log.get('sleep_hours', 0)
    calories_val = daily_log.get('calories', 0)
    strength_minutes_val = daily_log.get('strength_minutes', 0)
    cardio_minutes_val = daily_log.get('cardio_minutes', 0)
    mood_text_val = daily_log.get('mood_text', "기록 없음")

    total_exercise = strength_minutes_val + cardio_minutes_val
    
    prompt = f"""
    당신은 사용자의 하루 건강 기록을 종합적으로 분석하여 점수와 맞춤형 피드백을 제공하는 전문 헬스케어 AI 어드바이저입니다. 
    제공되는 모든 정보(사용자 기본 정보 및 오늘의 건강 기록)를 세심하게 고려하여 응답해주세요.

    [사용자 기본 정보]
    - 나이: {user_age}세
    - 성별: {user_gender}
    - 키: {user_height}cm
    - 몸무게: {user_weight}kg

    [오늘의 건강 기록]
    - 수면 시간: {sleep_hours_val:.1f} 시간
    - 섭취 칼로리: {calories_val} kcal (참고: 이 사용자의 예상 기초대사량(BMR)에 활동량(가벼운 활동)을 고려한 하루 권장 섭취량은 약 {tdee} kcal 입니다.)
    - 총 운동 시간: {total_exercise} 분 (일일 권장: 30-60분)
    - 오늘의 감정/스트레스 기록: "{mood_text_val}"

    [요청 작업]
    위 모든 데이터를 종합적으로 고려하여, 다음 7가지 항목을 포함하는 JSON 객체를 "반드시" 생성해주세요.
    각 항목에 대한 설명은 한국어로, 친절하고 전문적인 어투를 사용해주세요.

    1.  "holistic_health_score" (number): 모든 요소를 종합하여 판단한 오늘의 최종 건강 점수를 0점에서 100점 사이의 정수로 '직접 산출'해주세요. (예: 운동을 많이 했지만 수면이 부족하고 스트레스가 높으면 점수를 크게 낮춰주세요. 반대로 모든 요소가 균형 잡히면 높은 점수를 주세요.)
    2.  "score_reason" (string): 위 "holistic_health_score"를 산출한 가장 핵심적인 이유 1~2가지를 간결하게 설명해주세요. (예: "충분한 수면과 적절한 운동량은 긍정적이었으나, 섭취 칼로리가 다소 부족했습니다.")
    3.  "stress_score" (number): '오늘의 감정/스트레스 기록'을 분석하여 사용자의 스트레스 지수를 0(매우 긍정적, 스트레스 낮음)에서 100(매우 부정적, 스트레스 높음) 사이의 정수로 산출해주세요. 감정 기록이 긍정적이면 낮은 점수를, 부정적이면 높은 점수를 부여해주세요.
    4.  "physical_summary" (string): 오늘의 신체 활동(수면, 식사, 운동)에 대한 '객관적인 요약'을 1~2문장으로 작성해주세요. 잘한 점과 아쉬운 점이 있다면 수치를 언급하며 간략히 설명해주세요. (예: "수면 시간은 7.5시간으로 적절했으며, 총 2000kcal를 섭취하고 60분간 운동하여 활동적인 하루를 보냈습니다. 다만, 권장 섭취 칼로리 대비 약간 부족할 수 있습니다.")
    5.  "physical_feedback" (string): 오늘의 신체 활동 중 '가장 개선이 필요하거나 잘 유지해야 할 부분'에 대한 구체적이고 실천 가능한 팁 또는 격려를 1~2문장으로 제안해주세요. (예: "꾸준한 운동 습관은 매우 좋습니다! 다음번에는 유산소 운동 시간을 10분 정도 늘려보는 것을 추천합니다." 또는 "수면 시간이 다소 부족해 보입니다. 자기 전 스마트폰 사용을 줄이고 따뜻한 차를 마셔보는 건 어떨까요?")
    6.  "mental_summary" (string): '오늘의 감정/스트레스 기록'을 바탕으로 사용자의 현재 감정 상태를 '객관적으로 요약'해주세요 (1~2문장). (예: "기록에 따르면 오늘은 전반적으로 긍정적인 감정을 느끼신 것으로 보입니다." 또는 "다소 스트레스 받는 상황이 있었던 것으로 파악됩니다.")
    7.  "mental_feedback" (string): 위 정신적 분석에 대한 공감과 함께, 스트레스 관리나 긍정적 마음 유지를 위한 간단한 조언 또는 격려를 1~2문장으로 제공해주세요. (예: "긍정적인 하루를 보내신 것 같아 보기 좋습니다! 이 기분을 내일도 이어가시길 바랍니다." 또는 "스트레스는 누구에게나 찾아올 수 있습니다. 가벼운 산책이나 좋아하는 음악 감상으로 기분 전환을 해보세요.")
    """
    try:
        response = model.generate_content(prompt)
        # 응답 텍스트가 올바른 JSON 형식인지 추가 확인 (때때로 모델이 불완전한 JSON 반환 가능)
        response_text = response.text.strip()
        # Google API는 때때로 ```json ... ``` 마크다운으로 감싸서 반환하므로 제거
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        return json.loads(response_text)
    except Exception as e:
        print(f"Gemini 통합 분석 오류 또는 JSON 파싱 오류: {e}")
        print(f"Gemini 응답 원문: {response.text if 'response' in locals() else '응답 없음'}") # 디버깅용
        # 오류 발생 시 기본 응답 반환
        return {
            "holistic_health_score": 30, # 오류 시 낮은 점수
            "score_reason": "AI 분석 중 오류가 발생했습니다. 입력값을 확인하거나 잠시 후 다시 시도해주세요.",
            "stress_score": 50, # 중간값
            "mental_summary": "감정 분석 중 오류가 발생했습니다.",
            "mental_feedback": "AI 시스템 오류로 피드백을 드릴 수 없습니다. 잠시 후 다시 시도해주세요.",
            "physical_summary": "신체 활동 분석 중 오류가 발생했습니다.",
            "physical_feedback": "AI 시스템 오류로 피드백을 드릴 수 없습니다. 잠시 후 다시 시도해주세요."
        }

# 프롬프트에만 사용할 간단한 TDEE 계산 함수
def calculate_tdee_for_prompt(user_info):
    gender = user_info.get('gender', 'female') # 기본값 'female'
    weight_kg = float(user_info.get('weight_kg', 55)) # 부동소수점 변환 및 기본값
    height_cm = float(user_info.get('height_cm', 160))
    age = int(user_info.get('age', 30)) # 정수 변환 및 기본값

    if gender.lower() == 'male':
        bmr = 88.362 + (13.397 * weight_kg) + (4.799 * height_cm) - (5.677 * age)
    else: # female 또는 gender 정보가 없을 경우 female로 간주
        bmr = 447.593 + (9.247 * weight_kg) + (3.098 * height_cm) - (4.330 * age)
    return int(bmr * 1.375) # 활동량 보통(1.375)으로 가정

# --- 3. 메인 API 엔드포인트 ---
@app.route('/api/health-report', methods=['POST'])
def create_ai_driven_report():
    data = request.json
    if not data or 'dailyLog' not in data or 'userInfo' not in data:
        return jsonify({"error": "잘못된 요청 데이터입니다. 'dailyLog'와 'userInfo'를 포함해야 합니다."}), 400
    
    # userInfo가 비어있을 경우를 대비하여 기본값 처리 한 번 더 (get_ai_complete_report에서도 하지만, 여기서도 가능)
    user_info_from_req = data.get('userInfo', {})
    daily_log_from_req = data.get('dailyLog', {})

    full_daily_log = {
        'user_info': {
            'gender': user_info_from_req.get('gender', 'female'),
            'weight_kg': float(user_info_from_req.get('weight_kg', 55)),
            'height_cm': float(user_info_from_req.get('height_cm', 160)),
            'age': int(user_info_from_req.get('age', 30))
        },
        'sleep_hours': float(daily_log_from_req.get('sleep_hours', 0)),
        'calories': int(daily_log_from_req.get('calories', 0)),
        'strength_minutes': int(daily_log_from_req.get('strength_minutes', 0)),
        'cardio_minutes': int(daily_log_from_req.get('cardio_minutes', 0)),
        'mood_text': daily_log_from_req.get('mood_text', "기록 없음")
    }
    
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
    
@app.route('/')
def home():
    return "Flask API 서버가 정상적으로 실행 중입니다. API 엔드포인트는 /api/health-report 입니다."

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5001)), debug=True)
