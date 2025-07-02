#!/bin/bash

# 設定你的 MongoDB Atlas Project ID
PROJECT_ID=685b8e904e4901793704f34b

# 逐行讀取 cidr_list.txt 並加入 Atlas Network Access List
while read cidr; do
  if [[ ! -z "$cidr" ]]; then
    echo "Adding $cidr to Atlas project $PROJECT_ID..."
    atlas accessLists create "$cidr" --projectId $PROJECT_ID
  fi
done < cidr_list.txt