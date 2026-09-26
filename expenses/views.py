from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

expenses = []


@csrf_exempt
def expense_list(request):

    # GET - View all expenses
    if request.method == "GET":
        return JsonResponse({
            "message": "Expenses retrieved successfully",
            "expenses": expenses
        })

    # POST - Add expense
    elif request.method == "POST":
        data = json.loads(request.body)

        expense = {
            "id": len(expenses) + 1,
            "event_id": data.get("event_id"),
            "description": data.get("description"),
            "amount": data.get("amount"),
            "category": data.get("category")
        }

        expenses.append(expense)

        return JsonResponse({
            "message": "Expense added successfully",
            "expense": expense
        }, status=201)

    # PUT - Update expense
    elif request.method == "PUT":
        data = json.loads(request.body)

        expense_id = data.get("id")

        for expense in expenses:
            if expense["id"] == expense_id:

                expense["event_id"] = data.get(
                    "event_id", expense["event_id"]
                )
                expense["description"] = data.get(
                    "description", expense["description"]
                )
                expense["amount"] = data.get(
                    "amount", expense["amount"]
                )
                expense["category"] = data.get(
                    "category", expense["category"]
                )

                return JsonResponse({
                    "message": "Expense updated successfully",
                    "expense": expense
                })

        return JsonResponse({
            "message": "Expense not found"
        }, status=404)

    # DELETE - Delete expense
    elif request.method == "DELETE":
        data = json.loads(request.body)

        expense_id = data.get("id")

        for expense in expenses:
            if expense["id"] == expense_id:

                expenses.remove(expense)

                return JsonResponse({
                    "message": "Expense deleted successfully"
                })

        return JsonResponse({
            "message": "Expense not found"
        }, status=404)