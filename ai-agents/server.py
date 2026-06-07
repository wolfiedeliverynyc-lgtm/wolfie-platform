import os
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse
from agents import process_whatsapp_message

app = Flask(__name__)

@app.route("/whatsapp", methods=['POST'])
def whatsapp_reply():
    """
    هذه الدالة تستقبل الرسائل القادمة من WhatsApp عبر Twilio
    ثم تمررها لوكلاء الذكاء الاصطناعي (CrewAI) وترسل الرد.
    """
    # استخراج نص الرسالة
    incoming_msg = request.values.get('Body', '').strip()
    sender = request.values.get('From', '')

    print(f"📥 تلقينا رسالة من {sender}:\n{incoming_msg}")

    # تمرير الرسالة لفريق الوكلاء لتحليلها والرد عليها
    try:
        agent_response = process_whatsapp_message(incoming_msg)
    except Exception as e:
        agent_response = f"عذراً أيها المدير، حدث خطأ أثناء التحليل: {str(e)}"

    print(f"📤 رد الوكيل:\n{agent_response}")

    # إعداد الرد لإرساله عبر WhatsApp
    resp = MessagingResponse()
    resp.message(str(agent_response))

    return str(resp)

if __name__ == "__main__":
    print("🚀 خادم WhatsApp جاهز ويعمل على المنفذ 5000...")
    print("يرجى تشغيل أداة Ngrok لربط هذا الخادم بـ Twilio (إذا كنت تختبر محلياً).")
    app.run(port=5000, debug=True)
