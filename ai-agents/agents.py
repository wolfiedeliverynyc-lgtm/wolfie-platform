import os
from crewai import Agent, Task, Crew, Process
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()

# تهيئة واجهة Gemini API (مجاني)
# يجب وضع مفتاح API في ملف .env تحت اسم GEMINI_API_KEY
llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-pro",
    verbose=True,
    temperature=0.7,
    google_api_key=os.getenv("GEMINI_API_KEY")
)

# ==========================================
# 1. وكيل المبيعات (بأسلوب جوردان بيلفورت)
# ==========================================
sales_agent = Agent(
    role='Senior Sales Executive & Closer',
    goal='التواصل مع مطاعم نيويورك وسائقي التوصيل، وعرض منصة Wolfie، وإغلاق الصفقات بقوة وثقة.',
    backstory=(
        "أنت خبير مبيعات ومحترف في نظام 'Straight Line Persuasion'. "
        "تتحدث بيقين مطلق، ووضوح، وثقة تامة. "
        "نبرتك حادة، مقنعة، ولا هوادة فيها ولكنها احترافية جداً. "
        "تتعامل مع أي اعتراض (Objection) من المطاعم عن طريق العودة إلى قيمة تطبيق Wolfie. "
        "أنت لا تقبل 'لا' كإجابة، وتبيع لهم حلم زيادة الطلبات ومضاعفة الأرباح."
    ),
    verbose=True,
    allow_delegation=False,
    llm=llm
)

# ==========================================
# 2. وكيل التسويق (محتوى Faceless)
# ==========================================
marketing_agent = Agent(
    role='Creative Director & Viral Content Strategist',
    goal='إنشاء سيناريوهات ونصوص لفيديوهات يوتيوب القصيرة (Shorts) وريلز إنستغرام بدون وجه (Faceless) للترويج لـ Wolfie.',
    backstory=(
        "أنت خبير في خوارزميات السوشيال ميديا وعلم النفس البشري. "
        "تعرف كيف تكتب (Hooks) تخطف الانتباه في أول 3 ثوانٍ. "
        "تُصمم محتوى يحقق تفاعلاً عالياً ومشاركات، وتركز على جماليات الطعام (Aesthetics) "
        "وسهولة استخدام تطبيق Wolfie للمستخدمين."
    ),
    verbose=True,
    allow_delegation=False,
    llm=llm
)

# ==========================================
# 3. وكيل البيانات والتحليل
# ==========================================
analytics_agent = Agent(
    role='Chief Data Scientist',
    goal='تحليل بيانات مبيعات Wolfie، أداء الإعلانات، وتقديم رؤى قابلة للتنفيذ.',
    backstory=(
        "أنت خبير تحليلي وموجه بالأرقام فقط. "
        "تقوم بدراسة العائد على الإنفاق الإعلاني (ROAS)، تكلفة اكتساب العملاء، وحجم الطلبات. "
        "تقدم تقارير مختصرة ومدعومة بالبيانات لمساعدة المدير التنفيذي على اتخاذ قرارات مربحة."
    ),
    verbose=True,
    allow_delegation=False,
    llm=llm
)

def process_whatsapp_message(message):
    """
    هذه الدالة ستستقبل الرسالة من الواتساب وتحدد أي وكيل يجب أن يرد عليها
    """
    
    # بشكل مبدئي، سننشئ مهمة (Task) بناءً على رسالة الواتساب
    dynamic_task = Task(
        description=message,
        expected_output="استجابة نهائية دقيقة، أو سيناريو، أو رسالة مبيعات بناءً على طلب المدير التنفيذي.",
        agent=sales_agent # سيتم توجيه هذا برمجياً للوكيل المناسب لاحقاً
    )
    
    crew = Crew(
        agents=[sales_agent, marketing_agent, analytics_agent],
        tasks=[dynamic_task],
        verbose=2,
        process=Process.sequential
    )
    
    result = crew.kickoff()
    return result

if __name__ == "__main__":
    print("🚀 تم تشغيل قسم وكلاء الذكاء الاصطناعي لـ Wolfie بنجاح.")
    print("الوكلاء جاهزون للعمل!")
    # تجربة بسيطة (يمكنك إزالة علامة # لتجربتها)
    # response = process_whatsapp_message("اكتب رسالة مبيعات قوية لمطعم بيتزا في بروكلين لإقناعه بالاشتراك")
    # print(response)
