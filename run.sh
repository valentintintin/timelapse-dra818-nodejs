#!/bin/bash

if [[ $# -eq 0 ]]; then
    ./dhcpCheck.sh
    if [[ $? -eq 0 ]]; then
        echo "Disable USB 2, 3 and 4"
        /root/softs/uhubctl/uhubctl -a off -l 1-1 -p 3-4
        /root/softs/uhubctl/uhubctl -a off -l 1-1.1 -p 3
    else
        echo "Disable USB 2, 3, 4 and Ethernet"
        /root/softs/uhubctl/uhubctl -a off -l 1-1 -p 1,3-4
        /root/softs/uhubctl/uhubctl -a off -l 1-1.1 -p 1,3
    fi
fi

npm start
if [[ $? -eq 0 ]]; then
    ./ethernetCheck.sh || halt
else
    sleep 60
    ./run.sh noDhcpCheck
fi
