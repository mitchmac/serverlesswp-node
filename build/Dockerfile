FROM amazonlinux:2

RUN yum -y groups install "Development tools" \
  && yum -y install \
    libxml2-devel \
    libzip-devel \
    libcurl-devel \
    openssl-devel \
    bzip2-devel \
    gd-devel \
    mysql-devel \
    libjpeg-devel \
    libexif \
    libexif-devel \
    oniguruma-devel

WORKDIR /sqlite
RUN curl https://www.sqlite.org/2023/sqlite-autoconf-3420000.tar.gz | tar xzf -
WORKDIR sqlite-autoconf-3420000
RUN ./configure --libdir=/usr/lib64 --prefix=/usr
RUN make
RUN make install

WORKDIR /work

RUN curl -L http://ca3.php.net/get/php-8.1.22.tar.bz2/from/this/mirror --create-dirs -o /work/php.tar.bz2

RUN tar -jxvf php.tar.bz2 \
  && mkdir php-81-bin

WORKDIR /work/php-8.1.22

#ENV SQLITE_LIBS="-L/sqlite/sqlite-autoconf-3420000/.libs -lsqlite3"
#ENV SQLITE_CFLAGS="-I/sqlite/sqlite-autoconf-3420000"

RUN ./configure \
  --prefix=/work/php-81-bin/ \
  --enable-shared=no \
  --enable-static=yes \
  --without-pear \
  --enable-json \
  --with-openssl \
  --with-curl \
  --with-libxml \
  --enable-simplexml \
  --enable-xml \
  --enable-gd \
  --with-mhash \
  --enable-exif \
  --with-freetype \
  --enable-mbstring \
  --enable-sockets \
  --enable-pdo \
  --with-pdo-mysql \
  --enable-tokenizer \
  --with-zip \
  --with-mysqli \
  --with-bz2 \
  --with-zlib \
  --with-gettext \
  --enable-opcache 

RUN make install -j4