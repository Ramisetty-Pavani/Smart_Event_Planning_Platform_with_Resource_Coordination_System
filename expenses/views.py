from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

import json

from .models import Expense


@csrf_exempt
def expense_list(request):

    # =========================
    # GET - Get all expenses
    # =========================
    if request.method == "GET":

        expenses = Expense.objects.all()

        expense_data = []

        for expense in expenses:
            expense_data.append({
                "id": expense.id,
                "event_id": expense.event_id,
                "description": expense.description,
                "amount": float(expense.amount),
                "category": expense.category
            })

        return JsonResponse({
            "message": "Expenses retrieved successfully",
            "expenses": expense_data
        })

    # =========================
    # POST - Add expense
    # =========================
    elif request.method == "POST":

        try:
            data = json.loads(request.body)

        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        event_id = data.get("event_id")
        description = data.get("description")
        amount = data.get("amount")
        category = data.get("category")

        # Validation
        if event_id is None:
            return JsonResponse({
                "message": "event_id is required"
            }, status=400)

        if not description or not description.strip():
            return JsonResponse({
                "message": "Description is required"
            }, status=400)

        if amount is None:
            return JsonResponse({
                "message": "Amount is required"
            }, status=400)

        if not category or not category.strip():
            return JsonResponse({
                "message": "Category is required"
            }, status=400)

        # Validate event_id
        try:
            event_id = int(event_id)

        except (ValueError, TypeError):
            return JsonResponse({
                "message": "event_id must be a valid number"
            }, status=400)

        if event_id <= 0:
            return JsonResponse({
                "message": "event_id must be greater than 0"
            }, status=400)

        # Validate amount
        try:
            amount = float(amount)

        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Amount must be a valid number"
            }, status=400)

        if amount <= 0:
            return JsonResponse({
                "message": "Amount must be greater than 0"
            }, status=400)

        # Create database record
        expense = Expense.objects.create(
            event_id=event_id,
            description=description.strip(),
            amount=amount,
            category=category.strip()
        )

        return JsonResponse({
            "message": "Expense added successfully",
            "expense": {
                "id": expense.id,
                "event_id": expense.event_id,
                "description": expense.description,
                "amount": float(expense.amount),
                "category": expense.category
            }
        }, status=201)

    # =========================
    # PUT - Update expense
    # =========================
    elif request.method == "PUT":

        try:
            data = json.loads(request.body)

        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        expense_id = data.get("id")

        if expense_id is None:
            return JsonResponse({
                "message": "Expense id is required"
            }, status=400)

        try:
            expense_id = int(expense_id)

        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Expense id must be a valid number"
            }, status=400)

        try:
            expense = Expense.objects.get(id=expense_id)

        except Expense.DoesNotExist:
            return JsonResponse({
                "message": "Expense not found"
            }, status=404)

        # Update event_id
        if "event_id" in data:

            try:
                new_event_id = int(data["event_id"])

            except (ValueError, TypeError):
                return JsonResponse({
                    "message": "event_id must be a valid number"
                }, status=400)

            if new_event_id <= 0:
                return JsonResponse({
                    "message": "event_id must be greater than 0"
                }, status=400)

            expense.event_id = new_event_id

        # Update description
        if "description" in data:

            if not data["description"] or not data["description"].strip():
                return JsonResponse({
                    "message": "Description cannot be empty"
                }, status=400)

            expense.description = data["description"].strip()

        # Update amount
        if "amount" in data:

            try:
                new_amount = float(data["amount"])

            except (ValueError, TypeError):
                return JsonResponse({
                    "message": "Amount must be a valid number"
                }, status=400)

            if new_amount <= 0:
                return JsonResponse({
                    "message": "Amount must be greater than 0"
                }, status=400)

            expense.amount = new_amount

        # Update category
        if "category" in data:

            if not data["category"] or not data["category"].strip():
                return JsonResponse({
                    "message": "Category cannot be empty"
                }, status=400)

            expense.category = data["category"].strip()

        expense.save()

        return JsonResponse({
            "message": "Expense updated successfully",
            "expense": {
                "id": expense.id,
                "event_id": expense.event_id,
                "description": expense.description,
                "amount": float(expense.amount),
                "category": expense.category
            }
        })

    # =========================
    # DELETE - Delete expense
    # =========================
    elif request.method == "DELETE":

        try:
            data = json.loads(request.body)

        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        expense_id = data.get("id")

        if expense_id is None:
            return JsonResponse({
                "message": "Expense id is required"
            }, status=400)

        try:
            expense_id = int(expense_id)

        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Expense id must be a valid number"
            }, status=400)

        try:
            expense = Expense.objects.get(id=expense_id)

        except Expense.DoesNotExist:
            return JsonResponse({
                "message": "Expense not found"
            }, status=404)

        expense.delete()

        return JsonResponse({
            "message": "Expense deleted successfully"
        })

    return JsonResponse({
        "message": "Method not allowed"
    }, status=405)