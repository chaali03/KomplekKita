<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('warga', function (Blueprint $table) {
            $table->string('rt', 5)->nullable()->after('no_rumah');
            $table->string('rw', 5)->nullable()->after('rt');
            $table->enum('status', ['aktif','pindah','nonaktif'])->default('aktif')->after('rw');
            $table->boolean('verified')->default(false)->after('status');
            $table->index(['komplek_id','rt','rw','status']);
        });
    }

    public function down(): void
    {
        Schema::table('warga', function (Blueprint $table) {
            $table->dropIndex(['komplek_id','rt','rw','status']);
            $table->dropColumn(['rt','rw','status','verified']);
        });
    }
};
