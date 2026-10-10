#!/usr/bin/env bash
# Copies the Jira API jars needed to compile this app from a local Jira Data Center 10.x installation into ./lib.
# Atlassian's jars are not redistributed in this repository.
#   usage: sudo tools/collect-jira-api.sh [/opt/atlassian/jira]
set -euo pipefail
J="${1:-/opt/atlassian/jira}"
O="$(cd "$(dirname "$0")/.." && pwd)/lib"
mkdir -p "$O"
for p in sal-api atlassian-annotations atlassian-plugins-webresource-api atlassian-plugins-webresource-spi \
         atlassian-json-api jira-api atlassian-plugins-api atlassian-plugins-core jsr305; do
  cp "$J"/atlassian-jira/WEB-INF/lib/${p}-[0-9]*.jar "$O"/
done
cp "$J"/lib/servlet-api*.jar "$O"/ 2>/dev/null || cp "$J"/lib/javax.servlet*.jar "$O"/
cp "$J"/atlassian-jira/WEB-INF/atlassian-bundled-plugins/atlassian-rest-v2-plugin-*.jar "$O"/
ls -1 "$O"
