<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('iuran_pembayaran', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('iuran_id');
            $table->unsignedBigInteger('warga_id');
            $table->unsignedBigInteger('amount')->default(0);
            $table->string('method', 50)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index('iuran_id');
            $table->index('warga_id');
            $table->unique(['iuran_id', 'warga_id'], 'iuran_warga_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('iuran_pembayaran');
    }
};
