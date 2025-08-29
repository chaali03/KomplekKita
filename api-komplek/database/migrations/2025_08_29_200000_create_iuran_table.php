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
        Schema::create('iuran', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('komplek_id');
            $table->string('periode', 7); // YYYY-MM
            $table->unsignedBigInteger('amount');
            $table->timestamps();

            $table->index('komplek_id');
            $table->unique(['komplek_id', 'periode'], 'iuran_komplek_periode_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('iuran');
    }
};
