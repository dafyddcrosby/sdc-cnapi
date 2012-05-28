#!/usr/bin/bash
#
# Copyright (c) 2011 Joyent Inc., All rights reserved.
#

exec 4>/dev/console

set -o errexit
set -o pipefail
set -o xtrace


PATH=/usr/bin:/usr/sbin:/bin:/sbin
export PATH

fatal()
{
    # Any error message should be redirected to stderr:
    echo "Error: $1" 1>&2
    exit 1
}


setup_agents()
{
    AGENTS_SHAR_URL=$1
    AGENTS_SHAR_PATH=./agents-installer.sh

    cd /var/run
    /usr/bin/curl --silent --show-error ${AGENTS_SHAR_URL} -o $AGENTS_SHAR_PATH

    if [[ ! -f $AGENTS_SHAR_PATH ]]; then
        fatal "failed to download agents setup script"
    fi

    mkdir -p /opt/smartdc/agents/log
    /usr/bin/bash $AGENTS_SHAR_PATH &>/opt/smartdc/agents/log/install.log
    result=$(tail -n 1 /opt/smartdc/agents/log/install.log)
}


if [[ ! -d /opt/smartdc/agents/bin ]]; then
    setup_agents $1
fi

# Return SmartDC services statuses on STDOUT:
echo $(svcs -a -o STATE,FMRI|grep smartdc)

# Scripts to be executed by Ur need to explicitly return an exit status code:
exit 0
