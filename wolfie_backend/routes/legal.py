"""
Enterprise Legal API Routes
Endpoints to fetch active policies, and submit policy acceptances.
"""
from flask import Blueprint, request, jsonify
from database import get_db_session, transaction
from services.compliance_manager import ComplianceManager
from routes.auth import require_auth
import hashlib

legal_bp = Blueprint("legal", __name__)

@legal_bp.route("/pending", methods=["GET"])
@require_auth()
def get_pending_policies():
    """Returns the list of policies the user still needs to accept."""
    with get_db_session() as session:
        comp_mgr = ComplianceManager(session)
        pending = comp_mgr.get_pending_policies(request.user_id, request.user_role)
        return jsonify({"pending_policies": pending}), 200

@legal_bp.route("/accept", methods=["POST"])
@require_auth()
def accept_policy():
    """Accept a specific legal policy."""
    data = request.get_json(silent=True) or {}
    policy_key = data.get("policy_key")
    method = data.get("acceptance_method", "clickwrap")
    geo = data.get("geo_metadata")

    if not policy_key:
        return jsonify({"error": "policy_key required"}), 400

    ip_address = request.remote_addr
    user_agent = request.user_agent.string

    with transaction() as session:
        comp_mgr = ComplianceManager(session)
        try:
            acc = comp_mgr.record_acceptance(
                user_id=request.user_id,
                role=request.user_role,
                policy_key=policy_key,
                ip_address=ip_address,
                user_agent=user_agent,
                method=method,
                geo=geo
            )
            return jsonify({"message": "Policy accepted", "policy_key": policy_key, "version": acc.policy_version}), 200
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            return jsonify({"error": "Failed to accept policy"}), 500

@legal_bp.route("/status", methods=["GET"])
@require_auth()
def get_compliance_status():
    """Check if the user is fully compliant."""
    with get_db_session() as session:
        comp_mgr = ComplianceManager(session)
        state = comp_mgr.evaluate_user_compliance(request.user_id, request.user_role)
        return jsonify({"compliance_status": state}), 200


@legal_bp.route("/terms", methods=["GET"])
def get_terms_html():
    """Returns the official Terms of Service as HTML."""
    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wolfie Delivery - Terms of Service</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #f5f0e8; bg-color: #0a0a0a; background: #0a0a0a; max-width: 800px; margin: 40px auto; padding: 0 20px; }
        h1 { color: #ff5500; border-bottom: 2px solid #ff5500; padding-bottom: 10px; font-weight: 900; letter-spacing: -0.02em; }
        h2 { color: #ffffff; margin-top: 30px; font-weight: 700; }
        p { margin-bottom: 15px; color: #a0a0a0; }
        footer { margin-top: 50px; font-size: 0.8em; color: #666; border-top: 1px solid #222; padding-top: 20px; }
    </style>
</head>
<body>
    <h1>Terms of Service</h1>
    <p><strong>Last Updated: May 2026</strong></p>
    
    <h2>1. Project Legal Positioning</h2>
    <p>WOLFIE is positioned legally as a technology platform that connects customers, independent delivery drivers, and partner restaurants.</p>
    <p>WOLFIE is NOT a restaurant, a food manufacturer, a direct employer of drivers, or a transportation carrier. This distinction is critical for limiting liability and maintaining the independent contractor model for all courier operations.</p>
    
    <h2>2. Account Eligibility</h2>
    <p>Users must be at least 18 years old to register an account on the platform.</p>
    <p>Users under 18 may only use the platform under the direct involvement, supervision, and consent of a parent or legal guardian.</p>
    <p>This policy ensures stronger enforceability of digital contracts, aligns with standard United States platform regulations, and reduces legal exposure involving minors.</p>
    
    <h2>3. Payment Methods</h2>
    <p>Approved payment methods include major Credit/Debit Cards and secure electronic payment processors. Digital Wallets and local digital payment networks will be supported in future platform updates.</p>
    <p>Important Note: Cash on Delivery (COD) has been removed from our approved payment methods to protect our network from high fraud risk, fake orders, charge disputes, driver safety concerns, and to streamline operational complexity.</p>
    
    <h2>4. Order Cancellation Policy</h2>
    <p>Before Restaurant Acceptance: Customers may cancel their order freely for a full refund to their original payment method.</p>
    <p>After Restaurant Acceptance: Refund is not guaranteed once preparation has started. Partial charges may apply to cover ingredient costs.</p>
    <p>After Driver Pickup: Customers will usually be charged in full. Refunds at this stage are only issued if the issue qualifies under the Refund Policy.</p>
    
    <h2>5. Binding Arbitration Clause</h2>
    <p>By accepting these Terms of Service, you agree that any disputes arising under or relating to these Terms will be resolved through binding individual arbitration rather than in court.</p>
    <p>This clause reduces lawsuit exposure, prevents costly court litigation, and protects both parties against class-action lawsuits, in alignment with standard U.S. platform industry practices.</p>
    
    <h2>6. Limitation of Liability</h2>
    <p>WOLFIE acts solely as a marketplace and technology intermediary. Restaurants remain solely responsible for food quality, food safety, allergen declarations, and preparation accuracy. Drivers remain solely responsible for vehicle operation, safe delivery, compliance with traffic regulations, and active vehicle insurance obligations.</p>
    
    <footer>
        <p>&copy; 2026 Wolfie Tech Inc. All rights reserved.</p>
    </footer>
</body>
</html>"""
    return html_content, 200, {"Content-Type": "text/html"}


@legal_bp.route("/privacy", methods=["GET"])
def get_privacy_html():
    """Returns the official Privacy Policy as HTML."""
    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wolfie Delivery - Privacy Policy</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #f5f0e8; bg-color: #0a0a0a; background: #0a0a0a; max-width: 800px; margin: 40px auto; padding: 0 20px; }
        h1 { color: #ff5500; border-bottom: 2px solid #ff5500; padding-bottom: 10px; font-weight: 900; letter-spacing: -0.02em; }
        h2 { color: #ffffff; margin-top: 30px; font-weight: 700; }
        p { margin-bottom: 15px; color: #a0a0a0; }
        footer { margin-top: 50px; font-size: 0.8em; color: #666; border-top: 1px solid #222; padding-top: 20px; }
    </style>
</head>
<body>
    <h1>Privacy Policy</h1>
    <p><strong>Last Updated: May 2026</strong></p>
    
    <h2>1. Information Collected</h2>
    <p>WOLFIE collects personal information to provide safe and efficient delivery services. This includes: Name, Email address, Phone number, and Billing/Payment metadata. We also collect Device information (IP address, operating system, and browser version), Order history, internal Chat/Communication messages, and general Usage analytics.</p>
    
    <h2>2. GPS & Location Tracking Disclosure</h2>
    <p>To facilitate smart dispatching and keep customers informed, WOLFIE tracks real-time location data. We utilize real-time driver tracking, delivery tracking for customers, and background location usage during active deliveries for couriers. Background location tracking is legally required to ensure route efficiency and safety verification.</p>
    
    <h2>3. Purpose of Data Usage</h2>
    <p>Your data is used to coordinate order fulfillment and driver dispatching. We utilize tracking and transaction metadata for fraud prevention, dynamic pricing optimization, platform usage analytics, and customer support resolution. Additionally, data is used to improve our AI routing models and power marketing communications where permitted by law.</p>
    
    <h2>4. Marketing Communications</h2>
    <p>WOLFIE may send promotional emails, SMS notifications, and device push notifications regarding local restaurant deals and platform rewards. Users are provided with easy unsubscribe and opt-out mechanisms inside the application interface and footer of email communications, where legally required.</p>
    
    <h2>5. Data Sales Policy</h2>
    <p>WOLFIE does not sell personal user data to third parties. Exception: Data transfer may occur in connection with a corporate merger, acquisition, consolidation, restructuring, or the sale of company assets.</p>
    
    <footer>
        <p>&copy; 2026 Wolfie Tech Inc. All rights reserved.</p>
    </footer>
</body>
</html>"""
    return html_content, 200, {"Content-Type": "text/html"}

