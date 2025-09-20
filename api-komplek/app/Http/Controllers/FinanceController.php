<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class FinanceController extends Controller
{
    public function getTransactions()
    {
        return response()->json([
            'success' => true,
            'data' => []
        ]);
    }

    public function createTransaction(Request $request)
    {
        return response()->json([
            'success' => true,
            'message' => 'Transaction created successfully'
        ], 201);
    }

    public function updateTransaction(Request $request, $id)
    {
        return response()->json([
            'success' => true,
            'message' => 'Transaction updated successfully'
        ]);
    }

    public function deleteTransaction($id)
    {
        return response()->json([
            'success' => true,
            'message' => 'Transaction deleted successfully'
        ]);
    }

    public function getSummary()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'total_income' => 0,
                'total_expense' => 0,
                'balance' => 0
            ]
        ]);
    }

    public function applyFilters(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => []
        ]);
    }
}
