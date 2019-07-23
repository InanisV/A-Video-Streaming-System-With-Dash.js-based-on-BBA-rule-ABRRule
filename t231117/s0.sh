#!/bin/bash
#Transcoding video START
ffmpeg -i 'video/final.mp4' -map 0:v:0  -map 0:v:0 -map 0:v:0 -map 0:v:0 -map 0:a:0 \
-b:v:0 700k -filter:v:0 "scale=426:240" -profile:v:0 high \
-b:v:1 1000k -filter:v:1 "scale=640:360" -profile:v:1 high \
-b:v:2 2000k -filter:v:2 "scale=854:480" -profile:v:2 high \
-b:v:3 4000k -filter:v:3 "scale=1280:720" -profile:v:3 high \
-f dash -min_seg_duration 3000 -use_template 1 -use_timeline 1 \
-init_seg_name 'video/$Bandwidth$/init-stream.mp4' -media_seg_name 'video/$Bandwidth$/$Number%05d$.m4s' \
-adaptation_sets "id=0,streams=v  id=1,streams=a" manifest.mpd
#Transcoding video END
sh s1.sh > chunks.txt
