FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends openssh-server sudo python3 python3-apt ansible-core ca-certificates && rm -rf /var/lib/apt/lists/* \
 && (id ubuntu >/dev/null 2>&1 || useradd -m -s /bin/bash ubuntu) && usermod -aG sudo ubuntu \
 && echo 'ubuntu ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/lab \
 && mkdir -p /run/sshd /home/ubuntu/.ssh && chmod 700 /home/ubuntu/.ssh \
 && printf 'PasswordAuthentication no\nPermitRootLogin no\n' > /etc/ssh/sshd_config.d/lab.conf
COPY .local-ssh/id_ed25519.pub /home/ubuntu/.ssh/authorized_keys
RUN chown -R ubuntu:ubuntu /home/ubuntu/.ssh && chmod 600 /home/ubuntu/.ssh/authorized_keys
EXPOSE 22 80
CMD ["/usr/sbin/sshd", "-D", "-e"]
