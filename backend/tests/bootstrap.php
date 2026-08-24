<?php

/**
 * Test-suite bootstrap.
 *
 * Runs before the application boots (wired via phpunit.xml bootstrap attr).
 *
 * WHY THIS EXISTS: docker-compose injects DB_CONNECTION=mysql /
 * DB_DATABASE=supportdesk_mini / APP_ENV=local as real process environment
 * variables. Laravel's Dotenv reader consults $_SERVER FIRST, and PHPUnit's
 * <env force="true"> updates putenv()/$_ENV but NOT $_SERVER — so forced
 * phpunit.xml values lose to the container vars and tests have historically
 * connected to (and wiped) the dev MySQL database.
 *
 * Pinning ALL THREE stores here guarantees every consumer — Laravel's
 * Env::get(), plain getenv(), $_ENV, $_SERVER — resolves to the isolated
 * in-memory sqlite database before anything can open a connection.
 */

require __DIR__.'/../vendor/autoload.php';

$forced = [
    'APP_ENV' => 'testing',
    'DB_CONNECTION' => 'sqlite',
    'DB_DATABASE' => ':memory:',
];

foreach ($forced as $name => $value) {
    $_SERVER[$name] = $value;
    $_ENV[$name] = $value;
    putenv("$name=$value");
}
