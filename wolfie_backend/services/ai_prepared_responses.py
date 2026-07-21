import json

# Pre-compiled static answers for standard FAQ topics to save API tokens.
# Both English and Arabic versions are provided, matching the user's language.

FAQ_RESPONSES = {
    "registration_help": {
        "en": (
            "🐺 **How to Register & Sign Up on Wolfie:**\n\n"
            "1. **Customers**: Download the app or visit the home page, click 'Sign Up' in the menu, enter your details (email, phone, name), and verify your phone number via OTP.\n"
            "2. **Drivers**: Go to the login screen and click 'Apply to Drive'. Upload your KYC documents (ID/License, insurance proof). You will be approved within 24-48 hours once our team reviews your documents.\n"
            "3. **Restaurants**: Head to our Merchant Onboarding portal and click 'Register Restaurant'. Provide your business details, operating hours, and bank payout account. Once approved, you can set up your Sync Agent and start accepting orders!"
        ),
        "ar": (
            "🐺 **طريقة التسجيل وإنشاء حساب على Wolfie:**\n\n"
            "1. **العملاء**: قم بتحميل التطبيق أو زيارة الصفحة الرئيسية، اضغط على 'Sign Up' (إنشاء حساب) في القائمة، أدخل بياناتك (البريد، الهاتف، الاسم)، وأكد رقم هاتفك عبر رمز التحقق (OTP).\n"
            "2. **السائقين**: اذهب لصفحة تسجيل الدخول واضغط على 'Apply to Drive' (التقديم للقيادة). ارفع مستندات الهوية والترخيص (KYC). ستتم مراجعة طلبك وتفعيله خلال 24-48 ساعة.\n"
            "3. **المطاعم**: توجه لبوابة التجار واضغط على 'Register Restaurant'. أدخل بيانات عملك التجاري وساعات العمل والحساب البنكي. بعد الموافقة، يمكنك تثبيت تطبيق المزامنة والبدء في استقبال الطلبات!"
        )
    },
    "login_issues": {
        "en": (
            "🔑 **Trouble Logging In? Try these steps:**\n\n"
            "1. **Forgot Password**: Click the 'Forgot Password' link on the login screen. Enter your registered email, and we will send you a 6-digit OTP code to verify your identity and set a new password.\n"
            "2. **OTP Not Received**: Check your spam/junk folder. Ensure your phone number is entered with the correct country code.\n"
            "3. **Bypass & Demo**: If you are trying our app for testing, you can use the 'Bypass & Test' button on the customer login page to instantly sign in with our demo account (`customer_demo@wolfie.delivery`)."
        ),
        "ar": (
            "🔑 **تواجه مشكلة في تسجيل الدخول؟ جرب الآتي:**\n\n"
            "1. **نسيت كلمة المرور**: اضغط على رابط 'Forgot Password' في صفحة الدخول. أدخل بريدك الإلكتروني وسنرسل لك رمز OTP مكون من 6 أرقام لتحديث كلمة المرور.\n"
            "2. **لم يصلك رمز التحقق (OTP)**: يرجى التحقق من مجلد البريد العشوائي (Spam) أو التأكد من إدخال رقم الهاتف بشكل صحيح مع رمز الدولة.\n"
            "3. **الدخول التجريبي**: إذا كنت تختبر التطبيق فقط، يمكنك استخدام زر 'Bypass & Test' في صفحة الدخول لتسجيل الدخول الفوري ببيانات الحساب التجريبي (`customer_demo@wolfie.delivery`)."
        )
    },
    "fees_policy": {
        "en": (
            "💰 **Wolfie Pricing & Fees breakdown:**\n\n"
            "- **Service Fee**: Flat $1.50 service fee per order supporting platform operations.\n"
            "- **Delivery Fee**: Base delivery fee is $3.00, which supports local driver operations.\n"
            "- **Tax**: A dynamic New York sales tax of 8.875% applies to all food sales.\n"
            "All pricing breakdowns are shown transparently in your cart summary before you place an order."
        ),
        "ar": (
            "💰 **تفاصيل الرسوم والأسعار في Wolfie:**\n\n"
            "- **رسوم الخدمة**: رسوم ثابتة تبلغ $1.50 لكل طلب لدعم عمليات وتشغيل المنصة.\n"
            "- **رسوم التوصيل**: رسوم التوصيل الأساسية هي $3.00 تذهب لدعم السائقين المحليين.\n"
            "- **الضرائب**: تطبق ضريبة مبيعات ولاية نيويورك بنسبة 8.875% على مبيعات الأطعمة.\n"
            "يتم عرض تفاصيل جميع الرسوم والأسعار بوضوح في ملخص السلة قبل إتمام الطلب."
        )
    },
    "refund_policy": {
        "en": (
            "🔄 **Wolfie Refund & Cancellation Policy:**\n\n"
            "1. **Refund Eligibility**: If your food arrives cold, damaged, or items are missing, please contact support with **photo evidence within 2 hours** of delivery for full reimbursement.\n"
            "2. **Processing Time**: Approved refunds are processed back to your original payment method (Card/Stripe) and usually take 3-5 business days to appear on your bank statement.\n"
            "3. **Cancellations**: You can cancel an order free of charge before the restaurant accepts it. If the restaurant has already started preparing the food, a cancellation fee may apply."
        ),
        "ar": (
            "🔄 **سياسة الاسترداد والإلغاء في Wolfie:**\n\n"
            "1. **أهلية الاسترداد**: إذا وصل الطعام بارداً، تالفاً، أو كانت هناك أطباق مفقودة، يرجى التواصل معنا مع **إرفاق صور كدليل خلال ساعتين** من وقت التوصيل للحصول على استرداد كامل للمبلغ.\n"
            "2. **مدة المعالجة**: تتم إعادة المبالغ المستردة المعتمدة إلى وسيلة الدفع الأصلية (البطاقة/Stripe) وتستغرق عادةً 3-5 أيام عمل للظهور في كشف حسابك البنكي.\n"
            "3. **الإلغاء**: يمكنك إلغاء الطلب مجاناً قبل أن يقبله المطعم. في حال بدأ المطعم في إعداد الطعام بالفعل، قد يتم فرض رسوم إلغاء."
        )
    },
    "driver_payout_faq": {
        "en": (
            "🛵 **Driver Payout & Wallet Guide:**\n\n"
            "- **Payout Frequency**: Weekly direct deposits are initiated every Monday for the earnings of the previous week.\n"
            "- **Instant Cashout**: Drivers can request an instant cashout to their bank card or Zelle account (fees may apply, typically takes under 2 minutes).\n"
            "- **Bank Details**: Update your routing and account numbers under the 'Wallet' tab in your Profile menu."
        ),
        "ar": (
            "🛵 **دليل مستحقات السائقين والمحفظة:**\n\n"
            "- **مواعيد الدفع**: يتم إرسال الإيداع البنكي المباشر أسبوعياً كل يوم اثنين للأرباح المسجلة في الأسبوع السابق.\n"
            "- **السحب الفوري (Instant Cashout)**: يمكن للسائقين سحب أرباحهم فورياً إلى بطاقة البنك أو عبر خدمة Zelle (يستغرق عادةً أقل من دقيقتين، وقد تفرض رسوم بسيطة).\n"
            "- **البيانات البنكية**: يمكنك تحديث رقم الحساب المصرفي (Routing & Account numbers) من علامة تبويب 'Wallet' في قائمة ملفك الشخصي."
        )
    }
}

class AIPreparedResponses:
    
    @classmethod
    def get_response(cls, intent: str, lang: str = "en") -> str:
        """Get pre-defined response text if available."""
        if lang not in ["ar", "en"]:
            lang = "en"
            
        topic = FAQ_RESPONSES.get(intent)
        if topic:
            return topic.get(lang, topic.get("en"))
        return None
