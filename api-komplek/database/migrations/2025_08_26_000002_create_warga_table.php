<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('warga', function (Blueprint $table) {
            $table->id();
            $table->foreignId('komplek_id')->constrained('komplek')->cascadeOnDelete();
            $table->string('nama');
            $table->string('nik', 16);
            $table->string('telepon')->nullable();
            $table->string('alamat')->nullable();
            $table->string('blok')->nullable();
            $table->string('no_rumah')->nullable();
            $table->timestamps();
            $table->index(['komplek_id', 'nik']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warga');
    }
};
