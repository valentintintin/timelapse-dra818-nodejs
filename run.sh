#!/bin/bash

sudo ./dhcpCheck.sh
if [[ $? -eq 0 ]]; then
    echo "Disable USB 2, 3 and 4"
	sudo /root/softs/uhubctl/uhubctl -a off -l 1-1.1 -p 3
	sudo /root/softs/uhubctl/uhubctl -a off -l 1-1 -p 2-4
else
    echo "Disable USB 2, 3, 4 and Ethernet"
	sudo /root/softs/uhubctl/uhubctl -a off -l 1-1.1 -p 1,3
	sudo /root/softs/uhubctl/uhubctl -a off -l 1-1
fi

sudo node dist/index.js

./ethernetCheck.sh || sudo halt
