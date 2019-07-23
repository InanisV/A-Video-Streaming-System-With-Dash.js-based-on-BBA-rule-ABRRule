#!/bin/bash
chunkSize ()
{
	for file in `ls`
	do
		if [ "${file##*.}"x = "m4s"x ];then
			size=`stat -c %s $file`
			echo "$size"
		fi
	done
	echo ","
}

cd video
cd 700000
chunkSize
cd ../
cd 1000000
chunkSize
cd ../
cd 2000000
chunkSize
cd ../
cd 4000000
chunkSize
cd ../
cd ../
