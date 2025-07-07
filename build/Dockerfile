FROM amazonlinux:2023
ARG PHP_VERSION=8.1.33

RUN yum -y groups install "Development tools" \
  && yum -y install \
    libxml2-devel \
    libzip-devel \
    libcurl-devel \
    openssl-devel \
    bzip2-devel \
    gd-devel \
    libjpeg-devel \
    libexif \
    libexif-devel \
    oniguruma-devel

RUN curl -L https://dev.mysql.com/get/mysql80-community-release-el9-1.noarch.rpm --create-dirs -o /work/mysql80-community-release-el9-1.noarch.rpm
RUN dnf install /work/mysql80-community-release-el9-1.noarch.rpm -y
RUN rpm --import https://repo.mysql.com/RPM-GPG-KEY-mysql-2023
RUN dnf -y install mysql-devel

WORKDIR /sqlite
RUN curl https://www.sqlite.org/2023/sqlite-autoconf-3420000.tar.gz | tar xzf -
WORKDIR sqlite-autoconf-3420000
RUN ./configure --libdir=/usr/lib64 --prefix=/usr
RUN make
RUN make install

WORKDIR /work

RUN curl -L http://ca3.php.net/get/php-${PHP_VERSION}.tar.bz2/from/this/mirror --create-dirs -o /work/php.tar.bz2

RUN tar -jxvf php.tar.bz2 \
  && mkdir php-81-bin

WORKDIR /work/php-${PHP_VERSION}

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
  --enable-opcache \
  --disable-cgi

RUN make install -j4