#!/bin/bash

UPSTREAM=""
function get_upstream() {
    # Look for a default gateway
    UPSTREAM=$(ip r | grep default | cut -d ' ' -f 3)
}

function reach_upstream() {
    # exit code 0 = reachable, 1 = unreachable
    return $(ping -q -w 1 -c 1 ${UPSTREAM} > /dev/null)
}

get_upstream
reach_upstream
