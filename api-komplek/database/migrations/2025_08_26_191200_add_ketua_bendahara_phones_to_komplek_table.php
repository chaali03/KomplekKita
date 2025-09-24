<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('komplek', function (Blueprint $table) {
            if (!Schema::hasColumn('komplek', 'ketua_phone')) {
                $table->string('ketua_phone', 20)->nullable()->after('ketua');
            }
            if (!Schema::hasColumn('komplek', 'bendahara_phone')) {
                $table->string('bendahara_phone', 20)->nullable()->after('bendahara');
            }
            // optional: unique indexes for phone numbers
            $table->unique('ketua_phone', 'komplek_ketua_phone_unique');
            $table->unique('bendahara_phone', 'komplek_bendahara_phone_unique');
        });
    }

    public function down(): void
    {
        Schema::table('komplek', function (Blueprint $table) {
            try { $table->dropUnique('komplek_ketua_phone_unique'); } catch (\Throwable $e) {}
            try { $table->dropUnique('komplek_bendahara_phone_unique'); } catch (\Throwable $e) {}
            if (Schema::hasColumn('komplek', 'ketua_phone')) {
                $table->dropColumn('ketua_phone');
            }
            if (Schema::hasColumn('komplek', 'bendahara_phone')) {
                $table->dropColumn('bendahara_phone');
            }
        });
    }
};
