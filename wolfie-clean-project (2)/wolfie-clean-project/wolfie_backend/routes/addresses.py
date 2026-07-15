from flask import Blueprint, request, jsonify, g
from routes.auth import require_auth
from database import transaction, get_db_session
from database.schemas import Address

addresses_bp = Blueprint("addresses", __name__)

@addresses_bp.route("", methods=["GET"])
@require_auth()
def list_addresses():
    session = get_db_session()
    addresses = session.query(Address).filter(Address.user_id == request.user_id).order_by(Address.is_default.desc(), Address.created_at.desc()).all()
    return jsonify([{
        "id": a.id,
        "street": a.street,
        "apt": a.apt,
        "city": a.city,
        "notes": a.notes,
        "label": a.label,
        "is_default": a.is_default
    } for a in addresses]), 200

@addresses_bp.route("", methods=["POST"])
@require_auth()
def create_address():
    data = request.get_json(silent=True) or {}
    street = data.get("street", "").strip()
    city = data.get("city", "").strip()
    if not street or not city:
        return jsonify({"error": "street and city are required"}), 400

    label = data.get("label", "Home").strip()
    apt = data.get("apt", "").strip()
    notes = data.get("notes", "").strip()
    is_default = bool(data.get("is_default", False))

    with transaction() as session:
        # If this is the first address, make it default automatically
        existing_count = session.query(Address).filter(Address.user_id == request.user_id).count()
        if existing_count == 0:
            is_default = True

        if is_default:
            # Set other user addresses as not default
            session.query(Address).filter(Address.user_id == request.user_id).update({"is_default": False})

        new_addr = Address(
            user_id=request.user_id,
            street=street,
            apt=apt,
            city=city,
            notes=notes,
            label=label,
            is_default=is_default
        )
        session.add(new_addr)
        session.flush() # Populate ID

        return jsonify({
            "id": new_addr.id,
            "street": new_addr.street,
            "apt": new_addr.apt,
            "city": new_addr.city,
            "notes": new_addr.notes,
            "label": new_addr.label,
            "is_default": new_addr.is_default
        }), 201

@addresses_bp.route("/<address_id>", methods=["PUT"])
@require_auth()
def update_address(address_id):
    data = request.get_json(silent=True) or {}
    with transaction() as session:
        addr = session.query(Address).filter(Address.id == address_id, Address.user_id == request.user_id).first()
        if not addr:
            return jsonify({"error": "Address not found"}), 404

        if "street" in data: addr.street = data["street"].strip()
        if "city" in data: addr.city = data["city"].strip()
        if "apt" in data: addr.apt = data["apt"].strip()
        if "notes" in data: addr.notes = data["notes"].strip()
        if "label" in data: addr.label = data["label"].strip()
        
        is_default = data.get("is_default")
        if is_default is not None:
            is_default = bool(is_default)
            if is_default and not addr.is_default:
                session.query(Address).filter(Address.user_id == request.user_id).update({"is_default": False})
                addr.is_default = True
            elif not is_default and addr.is_default:
                # Cannot unset default unless setting another default
                pass

        return jsonify({
            "id": addr.id,
            "street": addr.street,
            "apt": addr.apt,
            "city": addr.city,
            "notes": addr.notes,
            "label": addr.label,
            "is_default": addr.is_default
        }), 200

@addresses_bp.route("/<address_id>", methods=["DELETE"])
@require_auth()
def delete_address(address_id):
    with transaction() as session:
        addr = session.query(Address).filter(Address.id == address_id, Address.user_id == request.user_id).first()
        if not addr:
            return jsonify({"error": "Address not found"}), 404

        was_default = addr.is_default
        session.delete(addr)

        if was_default:
            # Make next address default if any exist
            next_addr = session.query(Address).filter(Address.user_id == request.user_id).first()
            if next_addr:
                next_addr.is_default = True

        return jsonify({"message": "Address deleted"}), 200

@addresses_bp.route("/<address_id>/default", methods=["PATCH"])
@require_auth()
def set_default_address(address_id):
    with transaction() as session:
        addr = session.query(Address).filter(Address.id == address_id, Address.user_id == request.user_id).first()
        if not addr:
            return jsonify({"error": "Address not found"}), 404

        session.query(Address).filter(Address.user_id == request.user_id).update({"is_default": False})
        addr.is_default = True
        return jsonify({"message": "Default address updated"}), 200
