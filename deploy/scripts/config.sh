#!/bin/bash
. "`dirname $0`/always_included.sh"
run_template "$toolbar_dir/deploy/templates/toolbar_config.js.template" "$TOOLBAR_CONFIG"
