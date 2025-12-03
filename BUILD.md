To build docker container:
```
docker build --no-cache -t asterixcapri/croppix:1.0.0 -t asterixcapri/croppix:latest .
```

To run the container:
```
docker run --rm -it -p 3003:3003 asterixcapri/croppix:latest
```

To build with buildx:

```
docker buildx build --platform linux/amd64,linux/arm64 --no-cache -t asterixcapri/croppix:1.0.0 -t asterixcapri/croppix:latest . --push
```

To run with qemu:

```
docker run --rm -it -p 3003:3003 --platform arm64 -v /usr/bin/qemu-arm-static:/usr/bin/qemu-arm-static asterixcapri/croppix:1.0.0
```