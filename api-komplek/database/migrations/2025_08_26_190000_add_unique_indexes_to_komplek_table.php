<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('komplek', function (Blueprint $table) {
            // Add unique indexes for consistency at DB level
            if (!Schema::hasColumn('komplek', 'nama')) {
                // safety: do nothing if column missing (should exist)
            } else {
                $table->unique('nama', 'komplek_nama_unique');
            }
            if (Schema::hasColumn('komplek', 'ketua')) {
                $table->unique('ketua', 'komplek_ketua_unique');
            }
            if (Schema::hasColumn('komplek', 'bendahara')) {
                $table->unique('bendahara', 'komplek_bendahara_unique');
            }
        });
    }

    public function down(): void
    {
        Schema::table('komplek', function (Blueprint $table) {
            // Drop indexes if they exist
            try { $table->dropUnique('komplek_nama_unique'); } catch (\Throwable $e) {}
            try { $table->dropUnique('komplek_ketua_unique'); } catch (\Throwable $e) {}
            try { $table->dropUnique('komplek_bendahara_unique'); } catch (\Throwable $e) {}
        });
    }
};
