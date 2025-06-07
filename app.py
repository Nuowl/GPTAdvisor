import os
import json
import google.generativeai as genai
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime # 날짜/시간 기록을 위해 추가

# --- 1. 설정 ---
app = Flask(__name__)
CORS(app) 

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    print("CRITICAL: GOOGLE_API_KEY 환경 변수가 설정되지 않았습니다.")
else:
    try:
        genai.configure(api_key=GOOGLE_API_KEY)
        print("Gemini API Key configured successfully.")
    except Exception as e:
        print(f"CRITICAL: Gemini API Key 구성 중 오류 발생: {e}")

# --- 2. AI 통합 분석 함수 (대시보드용 - 이전과 동일) ---
def get_ai_complete_report(daily_log):
    model = genai.GenerativeModel('gemini-1.5-flash-latest', generation_config={"response_mime_type": "application/json"})
    user_info = daily_log.get('user_info', {})
    user_age = user_info.get('age', '정보 없음'); user_gender = user_info.get('gender', '정보 없음')
    user_height = user_info.get('height_cm', '정보 없음'); user_weight = user_info.get('weight_kg', '정보 없음')
    tdee = calculate_tdee_for_prompt(user_info) 
    sleep_hours_val = daily_log.get('sleep_hours', 0); calories_val = daily_log.get('calories', 0)
    strength_minutes_val = daily_log.get('strength_minutes', 0); cardio_minutes_val = daily_log.get('cardio_minutes', 0)
    mood_text_val = daily_log.get('mood_text', "기록 없음")
    total_exercise = strength_minutes_val + cardio_minutes_val
    
    prompt = f"""
    당신은 사용자의 하루 건강 기록을 종합적으로 분석하여 점수와 맞춤형 피드백을 제공하는 전문 헬스케어 AI 어드바이저입니다. 
    제공되는 모든 정보(사용자 기본 정보 및 오늘의 건강 기록)를 세심하게 고려하여 응답해주세요.

    [사용자 기본 정보]
    - 나이: {user_age}세, 성별: {user_gender}, 키: {user_height}cm, 몸무게: {user_weight}kg

    [오늘의 건강 기록]
    - 수면 시간: {sleep_hours_val:.1f} 시간, 섭취 칼로리: {calories_val} kcal (권장: 약 {tdee} kcal), 총 운동 시간: {total_exercise} 분 (권장: 30-60분), 오늘의 감정/스트레스 기록: "{mood_text_val}"

    [요청 작업]
    위 모든 데이터를 종합적으로 고려하여, 다음 7가지 항목을 포함하는 JSON 객체를 "반드시" 생성해주세요.
    각 항목에 대한 설명은 한국어로, 친절하고 전문적인 어투를 사용해주세요.

    1. "holistic_health_score" (number): 오늘의 최종 건강 점수 (0-100).
    2. "score_reason" (string): 위 점수 산출 핵심 이유 1~2가지.
    3. "stress_score" (number): 스트레스 지수 (0-100, 낮을수록 긍정).
    4. "physical_summary" (string): 신체 활동(수면,식사,운동) 객관적 요약 (1-2문장, 수치 언급).
    5. "physical_feedback" (string): 신체 활동 개선/유지 팁 또는 격려 (1-2문장).
    6. "mental_summary" (string): 감정 상태 객관적 요약 (1-2문장).
    7. "mental_feedback" (string): 정신적 분석에 대한 공감, 조언 또는 격려 (1-2문장).
    """
    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        if response_text.startswith("```json"): response_text = response_text[7:]
        if response_text.endswith("```"): response_text = response_text[:-3]
        return json.loads(response_text)
    except Exception as e:
        print(f"Gemini 통합 분석 오류: {e}")
        print(f"Gemini 응답 원문: {response.text if 'response' in locals() else '응답 없음'}")
        return {"holistic_health_score": 30, "score_reason": "AI 분석 중 오류. 입력값을 확인하거나 잠시 후 다시 시도해주세요.", "stress_score": 50, "mental_summary": "감정 분석 오류.", "mental_feedback": "AI 시스템 오류.", "physical_summary": "신체 활동 분석 오류.", "physical_feedback": "AI 시스템 오류."}

def calculate_tdee_for_prompt(user_info): # (이전과 동일)
    gender = user_info.get('gender', 'female'); weight_kg = float(user_info.get('weight_kg', 55)); height_cm = float(user_info.get('height_cm', 160)); age = int(user_info.get('age', 30))
    if gender.lower() == 'male': bmr = 88.362 + (13.397 * weight_kg) + (4.799 * height_cm) - (5.677 * age)
    else: bmr = 447.593 + (9.247 * weight_kg) + (3.098 * height_cm) - (4.330 * age)
    return int(bmr * 1.375)

@app.route('/api/health-report', methods=['POST']) # (이전과 동일)
def create_ai_driven_report():
    # ... (이전과 동일한 로직)
    data = request.json
    if not data or 'dailyLog' not in data or 'userInfo' not in data:
        return jsonify({"error": "잘못된 요청 데이터입니다. 'dailyLog'와 'userInfo'를 포함해야 합니다."}), 400
    user_info_from_req = data.get('userInfo', {}); daily_log_from_req = data.get('dailyLog', {})
    full_daily_log = {
        'user_info': {'gender': user_info_from_req.get('gender', 'female'),'weight_kg': float(user_info_from_req.get('weight_kg', 55)),'height_cm': float(user_info_from_req.get('height_cm', 160)),'age': int(user_info_from_req.get('age', 30))},
        'sleep_hours': float(daily_log_from_req.get('sleep_hours', 0)),'calories': int(daily_log_from_req.get('calories', 0)),
        'strength_minutes': int(daily_log_from_req.get('strength_minutes', 0)),'cardio_minutes': int(daily_log_from_req.get('cardio_minutes', 0)),
        'mood_text': daily_log_from_req.get('mood_text', "기록 없음")
    }
    ai_result = get_ai_complete_report(full_daily_log)
    report = {
        "todayHealthScore": ai_result.get('holistic_health_score'), "scoreReason": ai_result.get('score_reason'),
        "aiMentalAnalysis": {"summary": ai_result.get('mental_summary'), "feedback": ai_result.get('mental_feedback'), "stress_score": ai_result.get('stress_score')},
        "aiPhysicalAnalysis": {"summary": ai_result.get('physical_summary'), "feedback": ai_result.get('physical_feedback')}
    }
    return jsonify(report)
    
@app.route('/') # (이전과 동일)
def home():
    return "Flask API 서버가 정상적으로 실행 중입니다. API 엔드포인트는 /api/health-report 및 /api/chatbot 입니다."

# --- 3. 챗봇 API 엔드포인트 추가 ---
@app.route('/api/chatbot', methods=['POST'])
def handle_chatbot_request():
    data = request.json
    user_message = data.get('message', '')
    # 클라이언트에서 전달된 건강 컨텍스트 (사용자 기본 정보 및 최신 건강 기록/분석)
    health_context_from_client = data.get('healthContext', {}) 
    user_info_context = health_context_from_client.get('userInfo', {})
    daily_log_context = health_context_from_client.get('dailyLog', {})
    analysis_context = health_context_from_client.get('analysis', {})

    if not user_message:
        return jsonify({"reply": "메시지를 입력해주세요."}), 400

    # 모욕적이거나 관련 없는 메시지 필터링 (간단한 예시)
    offensive_keywords = ["바보", "멍청이", "쓰레기"] # 추가 가능
    irrelevant_keywords = ["오늘 점심 뭐", "로또 번호", "날씨 알려줘"] # 추가 가능
    if any(keyword in user_message for keyword in offensive_keywords) or \
        any(keyword in user_message for keyword in irrelevant_keywords):
        return jsonify({"reply": "너무 관련이 없는 메시지나 모욕적인 메시지에는 답변할 수 없습니다."})

    model = genai.GenerativeModel('gemini-1.5-flash-latest')
    
    # 프롬프트에 건강 컨텍스트 포함
    context_str = ""
    # 사용자가 자신의 정보를 명시적으로 묻거나, 현재 상태와 관련된 질문을 할 때만 컨텍스트를 더 자세히 제공
    if "내 정보" in user_message or "내 상태" in user_message or "나 어때" in user_message:
        context_str += "사용자의 현재 건강 컨텍스트 정보는 다음과 같습니다:\n"
        if user_info_context: context_str += f"- 기본 정보: 나이 {user_info_context.get('age', 'N/A')}세, 성별 {user_info_context.get('gender', 'N/A')}\n, 키 {user_info_context.get('height_cm', 'N/A')}cm, 몸무게 {user_info_context.get('weight_kg', 'N/A')}kg\n"    
        if daily_log_context: context_str += f"- 최근 기록: 수면 {daily_log_context.get('sleep_hours', 'N/A')}시간, 식사 {daily_log_context.get('calories', 'N/A')}kcal, 운동 {(daily_log_context.get('strength_minutes',0) + daily_log_context.get('cardio_minutes',0))}분\n"
        if analysis_context: context_str += f"- 최근 AI 분석: 건강점수 {analysis_context.get('todayHealthScore', 'N/A')}, 스트레스 지수 {analysis_context.get('aiMentalAnalysis', {}).get('stress_score', 'N/A')}\n"
    elif "수면" in user_message and daily_log_context.get('sleep_hours') is not None:
        context_str += f"참고: 사용자의 최근 수면 시간은 {daily_log_context.get('sleep_hours')}시간입니다.\n"
    elif ("식사" in user_message or "칼로리" in user_message) and daily_log_context.get('calories') is not None:
        context_str += f"참고: 사용자의 최근 섭취 칼로리는 {daily_log_context.get('calories')}kcal입니다.\n"
    # (운동, 스트레스 등 다른 키워드에 대한 컨텍스트 제공 로직 추가 가능)
    
    if not context_str.strip(): # 위 조건에 해당하지 않아 컨텍스트가 비어있다면
        context_str = "사용자의 일반적인 질문입니다. 건강 관련 조언을 할 기회가 있다면 자연스럽게 해 주세요.\n"

    prompt = f"""
    당신은 사용자의 건강 상태와 기록을 이해하려 노력하는, 친절하고 전문적인 AI 헬스케어 어드바이저입니다. 
    항상 공손하고 사용자의 감정을 고려하며 답변해주세요.
    아래 [추가 컨텍스트]가 제공된 경우, 이를 참고하여 사용자 질문에 답변하고, 필요하다면 건강 관련 조언을 자연스럽게 포함시켜주세요.
    하지만 매번 사용자 데이터를 반복해서 언급할 필요는 없습니다. 질문과 직접적으로 관련 있거나, 조언에 꼭 필요한 경우에만 간략히 언급해주세요.
    만약 질문이 건강과 전혀 관련 없어 보인다면, 건강과 연결 지을 수 있는 부분이 있는지 창의적으로 생각해보고 답변하거나, 자연스럽게 대화를 이어나가세요.
    너무 억지스럽게 건강과 연결 짓지는 마세요.

    [추가 컨텍스트]
    {context_str}
    [사용자 질문]
    "{user_message}"

    [답변 가이드라인]
    - 건강 관련 질문에는 상세하고 이해하기 쉽게 답변합니다.
    - 일반적인 대화에도 사용자의 건강 상태를 염두에 두고, 긍정적이고 지지적인 태도를 유지합니다.
    - 사용자가 스트레스 해소 방법으로 게임을 언급한다면, "적절한 게임은 스트레스 해소에 도움이 될 수 있지만, 과도한 시간 사용은 수면 부족이나 운동 부족으로 이어질 수 있으니 균형을 맞추는 것이 중요합니다." 와 같이 답변할 수 있습니다.
    - 사용자의 질문이 너무 짧거나 모호하면, 추가 정보를 요청할 수 있습니다.
    - 절대로 사용자를 비난하거나 부정적인 감정을 유발하는 답변은 하지 않습니다.
    """
    
    try:
        # print(f"Chatbot prompt for Gemini:\n{prompt}") # 필요시 디버깅용
        response = model.generate_content(prompt)
        reply_text = response.text.strip()
        # print(f"Gemini Chatbot raw response: {reply_text}") # 필요시 디버깅용
        return jsonify({"reply": reply_text})
    except Exception as e:
        print(f"Gemini 챗봇 오류: {e}")
        return jsonify({"reply": "죄송합니다, 답변을 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."})

# --- 4. GPT 격려 코멘트 생성 API 엔드포인트 추가 ---
@app.route('/api/encouragement', methods=['POST'])
def get_encouragement_comment():
    data = request.json
    user_info = data.get('userInfo', {})
    goal_score = data.get('goalScore', 70) # 기본 목표 70점
    current_avg_score = data.get('currentAvgScore', 0)
    points_remaining = data.get('pointsRemaining', goal_score - current_avg_score)
    
    # 최근 기록에서 취약점 찾기 (간단한 예시)
    recent_log = data.get('recentLog', {}) # dailyRecords의 가장 최근 log 객체 전달 필요
    vulnerable_point_text = ""
    if recent_log:
        if recent_log.get('sleep_hours', 8) < 6: # 6시간 미만이면 수면 부족
            vulnerable_point_text += "최근 수면 시간이 다소 부족했던 것 같습니다. "
        if (recent_log.get('strength_minutes',0) + recent_log.get('cardio_minutes',0)) < 30: # 총 운동 30분 미만
            vulnerable_point_text += "운동량이 조금 아쉬웠던 날이 있네요. "
        # (식단, 스트레스 등에 대한 분석도 추가 가능)

    model = genai.GenerativeModel('gemini-1.5-flash-latest')
    prompt = f"""
    당신은 사용자의 건강 목표 달성을 응원하는 긍정적이고 격려를 잘하는 AI 코치입니다.
    사용자는 건강 리포트 페이지에서 자신의 목표 건강 점수와 현재 상태를 보고 있습니다.
    아래 정보를 바탕으로 사용자에게 힘이 되는 격려 코멘트를 1~2문장으로 작성해주세요.

    [상황 정보]
    - 사용자의 목표 건강 점수: {goal_score}점
    - 사용자의 현재 (주간 평균) 건강 점수: {current_avg_score:.1f}점
    - 목표까지 남은 점수: {points_remaining}점
    - (선택적) 사용자의 최근 기록에서 파악된 개선 필요 사항: "{vulnerable_point_text.strip()}"

    [코멘트 생성 가이드라인]
    - 목표 점수에 도달하기 위해 노력하는 사용자를 격려합니다.
    - 남은 점수가 많다면, 작은 단계부터 시작할 수 있도록 용기를 줍니다.
    - 남은 점수가 적다면, 거의 다 왔다고 응원합니다.
    - 목표를 이미 달성했다면, 그 성과를 축하하고 유지하도록 격려합니다.
    - 만약 '개선 필요 사항'이 있다면, 그 부분을 부드럽게 언급하며 긍정적인 개선 방향을 함께 제시합니다. (예: "수면 시간이 조금 부족하셨지만, 조금만 더 신경 쓰시면 목표 달성에 큰 도움이 될 거예요!")
    - 항상 긍정적이고 희망찬 어투를 사용합니다.
    """
    try:
        # print(f"Encouragement prompt for Gemini:\n{prompt}") # 디버깅용
        response = model.generate_content(prompt)
        comment_text = response.text.strip()
        # print(f"Gemini Encouragement raw response: {comment_text}") # 디버깅용
        return jsonify({"comment": comment_text})
    except Exception as e:
        print(f"Gemini 격려 코멘트 생성 오류: {e}")
        return jsonify({"comment": "목표를 향해 꾸준히 나아가세요! 작은 변화가 큰 결과를 만듭니다."})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5001)), debug=True)
