<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('notifikasi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('komplek_id')->constrained('komplek')->cascadeOnDelete();
            $table->string('judul');
            $table->text('isi')->nullable();
            $table->string('target')->default('all'); // all|rt:XX|rw:YY|warga:ID
            $table->dateTime('terkirim_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
            $table->index(['komplek_id','target']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifikasi');
    }
};
