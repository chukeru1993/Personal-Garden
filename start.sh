#!/bin/sh
set -e

exec npm --prefix app run preview -- --port "${PORT:-3000}"
