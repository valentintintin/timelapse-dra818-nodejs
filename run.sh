#!/bin/bash

echo timer > /sys/class/leds/led1/trigger
date

amixer set PCM -- 100%

if [[ $# -eq 0 ]]; then
    /root/timelapse/dhcpCheck.sh
    if [[ $? -eq 0 ]]; then
        echo "Disable USB 2, 3 and 4"
        /root/softs/uhubctl/uhubctl -a off -l 1-1 -p 3-4
        /root/softs/uhubctl/uhubctl -a off -l 1-1.1 -p 3
    else
        echo heartbeat > /sys/class/leds/led1/trigger

        echo "Disable USB 2, 3, 4 and Ethernet"
        /root/softs/uhubctl/uhubctl -a off -l 1-1 -p 1,3-4
        /root/softs/uhubctl/uhubctl -a off -l 1-1.1 -p 1,3

        npm start --prefix /root/timelapse
        if [[ $? -eq 0 ]]; then
            /root/timelapse/ethernetCheck.sh
            if [[ $? -eq 1 ]]; then
                echo Halt
                /sbin/halt
            else
                echo Ethenet so stay awake
            fi
            echo timer > /sys/class/leds/led1/trigger
        else
            echo timer > /sys/class/leds/led1/trigger
            (sleep 60; /root/timelapse/run.sh noDhcpCheck) &
        fi
    fi
fi
