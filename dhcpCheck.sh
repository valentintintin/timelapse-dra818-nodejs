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

NIC=""
function reach_dhcp_server() {
	# Find nics by ifconfig
	nics=($(ifconfig | egrep -ow 'eth[0-9]{1,2}'))
	for nic in ${nics}; do
		# If a DHCP server is found, set it on $NIC and break
		reach_dhcp_server_on_interface ${nic} && { NIC=${nic}; return 0; }
	done;
}

function reach_dhcp_server_on_interface() {
	local interface=${1}
	# nmap command to find a DHCP server on an interface
	local nmap_command="sudo nmap --script broadcast-dhcp-discover -e ${interface}"

	# exit code 0 = router, 1 = no router
	return $(${nmap_command} 2>/dev/null | grep Router | egrep -wo '[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}' > /dev/null)
}

function reset_ip() {
	# Tell dhcpcd to rebind $NIC
	dhcpcd -n ${NIC}
}

# Detect if there's an upstream and if it's reachable. If so, exit
get_upstream
if ! [[ -z ${UPSTREAM} ]]; then
	echo "Trying to ping ${UPSTREAM}"; reach_upstream && echo "Ping succeeded, keeping IP"; exit 0 || echo "Ping failed..."
fi

# Check for a DHCP server. If not found, exit
echo "No upstream, checking for DHCP server"; reach_dhcp_server || { echo "DHCP server not found"; exit 0; }

# Lets go
echo "DHCP server found, resetting IP"; reset_ip
