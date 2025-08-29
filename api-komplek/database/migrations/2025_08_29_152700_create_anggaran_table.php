<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('anggaran', function (Blueprint $table) {
            $table->id();
            $table->foreignId('komplek_id')->constrained('komplek')->cascadeOnDelete();
            $table->string('periode', 7); // YYYY-MM
            $table->enum('kategori', ['iuran','perbaikan','operasional']);
            $table->decimal('rencana', 18, 2)->default(0);
            $table->decimal('realisasi', 18, 2)->default(0);
            $table->text('catatan')->nullable();
            $table->timestamps();
            $table->unique(['komplek_id','periode','kategori']);
            $table->index(['komplek_id','periode']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('anggaran');
    }
};
