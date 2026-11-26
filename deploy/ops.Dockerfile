FROM postgres:17-alpine@sha256:eee6c6e1b0894fa4fe0075eb054af9fd1cf39a35321c2d4110626cfe506411fb
RUN mkdir -p /backups && chown postgres:postgres /backups
COPY deploy/backup.sh deploy/monitor.sh /opt/
USER postgres
ENTRYPOINT ["/bin/sh"]
CMD ["/opt/backup.sh"]
