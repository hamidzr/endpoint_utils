#!/bin/bash
ETCD_VER=v3.2.0-rc.0

# choose either URL
GOOGLE_URL=https://storage.googleapis.com/etcd
GITHUB_URL=https://github.com/coreos/etcd/releases/download
DOWNLOAD_URL=${GOOGLE_URL}

rm -f /tmp/etcd-${ETCD_VER}-linux-amd64.tar.gz
rm -rf /tmp/etcd && mkdir -p /tmp/etcd

curl -L ${DOWNLOAD_URL}/${ETCD_VER}/etcd-${ETCD_VER}-linux-amd64.tar.gz -o /tmp/etcd-${ETCD_VER}-linux-amd64.tar.gz
tar xzvf /tmp/etcd-${ETCD_VER}-linux-amd64.tar.gz -C /tmp/etcd --strip-components=1

/tmp/etcd/etcd --version
<<COMMENT
etcd Version: 3.2.0-rc.0
Git SHA: 7e6d876
Go Version: go1.8.1
Go OS/Arch: linux/amd64
COMMENT

ETCDCTL_API=3 /tmp/etcd/etcdctl version
<<COMMENT
etcdctl version: 3.2.0-rc.0
API version: 3.2
start server by sudo nohup /tmp/etcd/etcd &
COMMENT





# ETCD_VER=v2.3.8
# DOWNLOAD_URL=https://github.com/coreos/etcd/releases/download
# curl -L ${DOWNLOAD_URL}/${ETCD_VER}/etcd-${ETCD_VER}-linux-amd64.tar.gz -o /tmp/etcd-${ETCD_VER}-linux-amd64.tar.gz
# mkdir -p /tmp/etcd && tar xzvf /tmp/etcd-${ETCD_VER}-linux-amd64.tar.gz -C /tmp/etcd --strip-components=1

# /tmp/etcd/etcd --version

# # git SHA: 7e4fc7e
# # go Version: go1.7.5
# # go OS/Arch: linux/amd64