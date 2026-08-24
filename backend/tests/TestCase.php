<?php

namespace Tests;

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Safety guard, layer 1 (pre-boot, early signal): refuse to run any test
     * unless the effective database configuration points at the isolated
     * in-memory sqlite database.
     *
     * Checks the same store precedence Laravel's Dotenv reader uses
     * ($_SERVER before $_ENV before getenv) because PHPUnit's <env force>
     * entries do not populate all three stores.
     *
     * Companion layers:
     *   - tests/bootstrap.php pins every env store before boot.
     *   - layer 2 below re-checks the booted config inside
     *     createApplication(), which runs BEFORE trait initialization, so
     *     RefreshDatabase cannot execute migrate:fresh against anything real.
     */
    protected function setUp(): void
    {
        $connection = $_SERVER['DB_CONNECTION']
            ?? $_ENV['DB_CONNECTION']
            ?? getenv('DB_CONNECTION');
        $database = $_SERVER['DB_DATABASE']
            ?? $_ENV['DB_DATABASE']
            ?? getenv('DB_DATABASE');

        if ($connection !== 'sqlite' || $database !== ':memory:') {
            fwrite(STDERR, sprintf(
                '%sTEST SAFETY GUARD (layer 1, pre-boot) TRIGGERED: refusing to run tests.%s' .
                'Effective DB config is [%s / %s]; this suite requires sqlite / :memory:.%s' .
                'Proceeding would risk RefreshDatabase running migrate:fresh against a real database.%s',
                PHP_EOL,
                PHP_EOL,
                var_export($connection, true),
                var_export($database, true),
                PHP_EOL,
                PHP_EOL
            ));

            self::fail(
                'Test safety guard: effective DB config is not sqlite/:memory: ' .
                "(got [{$connection} / {$database}])."
            );
        }

        parent::setUp();
    }

    /**
     * Safety guard, layer 2 (post-boot, authoritative).
     *
     * Runs immediately after the application boots but BEFORE trait
     * initialization (setUpTraits) invokes RefreshDatabase. Deliberately NOT
     * implemented as a refreshTestDatabase() override: test classes compose
     * the RefreshDatabase trait directly, and a child class's trait method
     * shadows a same-named parent method, which made that approach dead code.
     *
     * Fail-closed: throws before returning the app whenever the booted
     * configuration does not target in-memory sqlite, so no migration or
     * query can ever execute against a real database.
     */
    public function createApplication(): Application
    {
        $app = parent::createApplication();

        $default = $app->make('config')->get('database.default');
        $database = $app->make('config')->get("database.connections.{$default}.database");

        if ($default !== 'sqlite' || $database !== ':memory:') {
            fwrite(STDERR, sprintf(
                '%sTEST SAFETY GUARD (layer 2, post-boot) TRIGGERED: refusing to run tests.%s' .
                'Booted config resolves to [%s / %s]; this suite requires sqlite / :memory:.%s' .
                'No migration or query has been executed; aborting before RefreshDatabase.%s',
                PHP_EOL,
                PHP_EOL,
                var_export($default, true),
                var_export($database, true),
                PHP_EOL,
                PHP_EOL
            ));

            throw new \RuntimeException(
                'Test safety guard: booted database config is not sqlite/:memory: ' .
                "(got [{$default} / {$database}])."
            );
        }

        return $app;
    }
}
