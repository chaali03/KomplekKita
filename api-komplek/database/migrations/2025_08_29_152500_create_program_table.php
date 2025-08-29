<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('program', function (Blueprint $table) {
            $table->id();
            $table->foreignId('komplek_id')->constrained('komplek')->cascadeOnDelete();
            $table->string('judul');
            $table->text('deskripsi')->nullable();
            $table->date('tanggal_mulai')->nullable();
            $table->date('tanggal_selesai')->nullable();
            $table->string('status')->default('draft'); // draft|aktif|selesai|dibatalkan
            $table->json('meta')->nullable();
            $table->timestamps();
            $table->index(['komplek_id','status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('program');
    }
};
