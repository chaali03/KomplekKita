<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ImportBatch extends Model
{
    use HasFactory;

    protected $table = 'import_batches';

    protected $fillable = [
        'komplek_id',
        'tipe', // warga | keuangan
        'total_rows',
        'success_rows',
        'fail_rows',
        'created_by',
    ];
}
