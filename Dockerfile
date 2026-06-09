FROM php:8.3-apache

COPY docker/php-uploads.ini /usr/local/etc/php/conf.d/uploads.ini

WORKDIR /var/www/html

COPY . .

RUN chown -R www-data:www-data data images \
    && chmod -R 775 data images

EXPOSE 80
