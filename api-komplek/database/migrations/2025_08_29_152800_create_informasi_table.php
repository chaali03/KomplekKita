<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('informasi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('komplek_id')->constrained('komplek')->cascadeOnDelete();
            $table->string('judul');
            $table->text('isi')->nullable();
            $table->enum('status', ['draft','publish','arsip'])->default('draft');
            $table->dateTime('tayang_mulai')->nullable();
            $table->dateTime('tayang_selesai')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
            $table->index(['komplek_id','status']);
            $table->index(['komplek_id','tayang_mulai','tayang_selesai']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('informasi');
    }
};
