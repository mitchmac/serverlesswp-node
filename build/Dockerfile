FROM amazonlinux:2023
ARG PHP_VERSION=8.3.33

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
    oniguruma-devel \
    libwebp-devel

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

# https://www.php.net/downloads.php?os=linux&osvariant=linux-ubuntu&version=default&source=Y
ARG PHP_SHA256=f9c9f4d0cd7692c6e3da363cd4ca72a826a49ae18f5ed430b6fcae7bc2881e18
RUN curl -fSL https://www.php.net/distributions/php-${PHP_VERSION}.tar.bz2 -o /work/php.tar.bz2 \
  && echo "${PHP_SHA256}  /work/php.tar.bz2" | sha256sum -c -

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
  --with-jpeg \
  --with-webp \
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
