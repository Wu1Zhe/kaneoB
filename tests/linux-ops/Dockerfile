FROM docker:29-cli
RUN apk add --no-cache python3 age rsync openssh openssh-server coreutils bash postgresql16 postgresql16-client su-exec
COPY tests/linux-ops/docker-fixture.py /test-bin/docker
RUN chmod 755 /test-bin/docker
ENV PATH=/test-bin:$PATH \
    PYTHONDONTWRITEBYTECODE=1 \
    KANEO_OPS_INTEGRATION=1 \
    KANEO_TEST_DOCKER_ROOT=/tmp/kaneob-native-fixture
WORKDIR /workspace
ENTRYPOINT []
CMD ["python3", "-m", "unittest", "discover", "-s", "tests/linux-ops", "-v"]
