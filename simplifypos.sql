-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 15-06-2025 a las 21:41:42
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `simplifypos`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `account`
--

CREATE TABLE `account` (
  `id` bigint(20) NOT NULL,
  `creation_date` datetime(6) NOT NULL,
  `is_pay` bit(1) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `total` double DEFAULT NULL,
  `user_id` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `account_seq`
--

CREATE TABLE `account_seq` (
  `next_val` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `account_seq`
--

INSERT INTO `account_seq` (`next_val`) VALUES
(1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `category`
--

CREATE TABLE `category` (
  `id` bigint(20) NOT NULL,
  `iva` int(11) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `category`
--

INSERT INTO `category` (`id`, `iva`, `name`) VALUES
(1, 0, 'Alimentos no procesados (frutas, verduras, granos).'),
(2, 0, 'Productos de panadería artesanal.'),
(3, 0, 'Libros y publicaciones educativas.'),
(4, 0, 'Medicamentos y productos farmacéuticos'),
(5, 0, 'Útiles escolares básicos.'),
(6, 0, 'Servicios médicos y hospitalarios.'),
(7, 0, 'Transporte público urbano.'),
(8, 0, 'Productos agrícolas en estado natural.'),
(9, 0, 'Carnes y pescados sin procesar.'),
(10, 0, 'Huevos y lácteos no industrializados.'),
(11, 5, 'Alimentos procesados (enlatados, empacados).'),
(12, 5, 'Bebidas no alcohólicas (jugos, gaseosas).'),
(13, 5, 'Chocolatería y confitería.'),
(14, 5, 'Café y té empacados.'),
(15, 5, 'Productos de panadería industrial.'),
(16, 19, 'Electrodomésticos mayores (neveras, lavadoras).'),
(17, 19, 'Tecnología (celulares, computadores).'),
(18, 19, 'Muebles y artículos para el hogar.'),
(19, 19, 'Ropa y calzado para adultos.'),
(20, 19, 'Joyas y artículos de lujo.'),
(21, 19, 'Telecomunicaciones (planes de datos).'),
(22, 19, 'Entretenimiento (cines, eventos).'),
(23, 19, 'Vehículos y motocicletas.'),
(24, 19, 'Licores y bebidas alcohólicas.'),
(25, 19, 'Productos de tabaco.'),
(26, 19, 'Servicios hoteleros y de alojamiento'),
(27, 19, 'Combustibles (gasolina, diésel)'),
(28, 19, 'Servicios profesionales (abogados, contadores)'),
(29, 5, 'Artículos para bebés y niños'),
(30, 19, 'Software y servicios digitales'),
(31, 0, 'Servicios financieros (bancos, seguros)'),
(32, 0, 'Servicios públicos (agua, luz, gas)');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `client`
--

CREATE TABLE `client` (
  `id` bigint(20) NOT NULL,
  `born_date` datetime(6) DEFAULT NULL,
  `document_id` bigint(20) NOT NULL,
  `document_type` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `gender` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `user_id` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `client`
--

INSERT INTO `client` (`id`, `born_date`, `document_id`, `document_type`, `email`, `gender`, `name`, `phone`, `user_id`) VALUES
(1, '1965-01-10 05:00:00.000000', 2193879, 'CC', 'admabaga@outlook.com', 'Femenino', 'Adriana Garcia', '3218854756', 2);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `product`
--

CREATE TABLE `product` (
  `id` bigint(20) NOT NULL,
  `code` bigint(20) DEFAULT NULL,
  `internal_code` varchar(255) DEFAULT NULL,
  `is_active` bit(1) DEFAULT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `product_unit_price` int(11) DEFAULT NULL,
  `product_unit_price_id` bigint(20) DEFAULT NULL,
  `quantity` int(11) DEFAULT NULL,
  `supplier` varchar(255) DEFAULT NULL,
  `category_id` bigint(20) DEFAULT NULL,
  `user_id` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `product`
--

INSERT INTO `product` (`id`, `code`, `internal_code`, `is_active`, `product_name`, `product_unit_price`, `product_unit_price_id`, `quantity`, `supplier`, `category_id`, `user_id`) VALUES
(1, 459, '20', b'1', 'Chorizo (Santa Rosano)', 2500, 1, 100, 'Envases S.A.S', 9, 2),
(2, 588, '20', b'1', 'Cerveza Grande(750ML)', 5000, 2, 50, 'Fabrica Licores Antioquia', 24, 1),
(52, 458, '1284', b'1', 'Cerveza Grande(750ML)', 7500, 52, 51, 'Fabrica Licores Antioquia', 24, 2),
(102, 8977, '941', b'1', 'Cerveza Pequeña(330ML)', 6000, 102, 60, 'Envases S.A.S', 24, 2),
(152, 10009, '69', b'1', 'Cerveza Grande(1000ML)', 7500, 152, 60, 'Envases S.A.S', 24, 2),
(153, 9898, '95659', b'1', 'Aguardiente', 30000, 153, 20, 'Fabrica Licores Antioquia', 24, 2),
(202, 12348, '41852', b'1', 'Chokis (Galleta)', 1000, 202, 60, 'Envases S.A.S', 13, 2);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `product_price`
--

CREATE TABLE `product_price` (
  `id` bigint(20) NOT NULL,
  `name_product_price` varchar(255) DEFAULT NULL,
  `price` int(11) DEFAULT NULL,
  `product_quantity` int(11) DEFAULT NULL,
  `product_id` bigint(20) DEFAULT NULL,
  `user_id` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `product_price`
--

INSERT INTO `product_price` (`id`, `name_product_price`, `price`, `product_quantity`, `product_id`, `user_id`) VALUES
(1, NULL, 2000, 1, 1, 2),
(2, NULL, 5000, 1, 2, 2),
(52, NULL, 6000, 1, 52, 2),
(102, NULL, 6000, 1, 102, 2),
(152, NULL, 7500, 1, 152, 2),
(153, NULL, 30000, 1, 153, 2),
(202, NULL, 1000, 1, 202, 2);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `product_price_seq`
--

CREATE TABLE `product_price_seq` (
  `next_val` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `product_price_seq`
--

INSERT INTO `product_price_seq` (`next_val`) VALUES
(301);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `product_seq`
--

CREATE TABLE `product_seq` (
  `next_val` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `product_seq`
--

INSERT INTO `product_seq` (`next_val`) VALUES
(301);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `regimen`
--

CREATE TABLE `regimen` (
  `id` bigint(20) NOT NULL,
  `description` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `regimen`
--

INSERT INTO `regimen` (`id`, `description`, `name`) VALUES
(1, 'Para pequeños contribuyentes con ingresos menores a 1,900 UVT anuales. Pagan impuestos simplificados y tienen menos obligaciones formales. Ideal para negocios pequeños y comerciantes informales.', 'Régimen Simplificado'),
(2, 'Para personas jurídicas y naturales con ingresos superiores a 1,900 UVT anuales. Tienen todas las obligaciones tributarias (IVA, renta, retención en la fuente). Obligatorio para sociedades y empresas establecidas.', 'Régimen Ordinario'),
(3, 'Para empresas con altos volúmenes de ingresos o activos designadas por la DIAN. Tienen obligaciones adicionales de reporte y plazos especiales. Aplican bancos, grandes multinacionales y empresas de sectores estratégicos.', 'Gran Contribuyente'),
(4, 'Para Micro, pequeñas y medianas empresas con beneficios tributarios especiales. Tienen tarifas reducidas y facilidades de pago. Deben cumplir requisitos de tamaño según clasificación legal.', 'Régimen Mipyme'),
(5, 'Para actividades agrícolas, pecuarias, forestales y pesqueras. Tienen tratamientos especiales en IVA y renta. Beneficios para pequeños y medianos productores del campo.', 'Régimen Agropecuario'),
(6, 'Para artistas, escritores y profesionales de la cultura con ingresos por derechos de autor. Tarifas especiales y tratamientos preferenciales.', 'Régimen Especial Cultural'),
(7, 'Para empresas autorizadas a operar en zonas francas con beneficios de impuesto de renta e IVA. Requieren aprobación previa y cumplimiento de inversiones.', 'Régimen de Zonas Francas'),
(8, 'Para Empresas de Tecnología y Negocios Digitales con beneficios específicos. Aplica a startups tecnológicas que cumplan requisitos de innovación.', 'Régimen Tributario Especial para ETB'),
(9, 'Para personas o entidades no obligadas a cobrar IVA (algunas entidades sin ánimo de lucro, exportadores). No facturan IVA pero pueden deducir compras.', 'No Responsable de IVA'),
(10, 'Para sectores específicos como telefonía móvil, servicios de entretenimiento y otros gravados con este impuesto especial.', 'Régimen de Impuesto Nacional al Consumo');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sale`
--

CREATE TABLE `sale` (
  `id` bigint(20) NOT NULL,
  `quantity_product_price` int(11) DEFAULT NULL,
  `quantity_units` int(11) DEFAULT NULL,
  `revenue` int(11) DEFAULT NULL,
  `sale_date` datetime(6) NOT NULL,
  `sale_price` int(11) DEFAULT NULL,
  `unit_price` int(11) DEFAULT NULL,
  `account_id` bigint(20) DEFAULT NULL,
  `product_id` bigint(20) DEFAULT NULL,
  `product_price_id` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sale_seq`
--

CREATE TABLE `sale_seq` (
  `next_val` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `sale_seq`
--

INSERT INTO `sale_seq` (`next_val`) VALUES
(1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `spent`
--

CREATE TABLE `spent` (
  `id` bigint(20) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `spent_date` datetime(6) DEFAULT NULL,
  `value` double DEFAULT NULL,
  `user_id` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `spent`
--

INSERT INTO `spent` (`id`, `description`, `name`, `spent_date`, `value`, `user_id`) VALUES
(1, 'Artículos de papelería', 'Compra de oficina', '2025-06-01 00:00:00.000000', 45500, 2),
(2, 'Pago de oficina', 'Alquiler', '2025-06-01 00:00:00.000000', 1200000, 2),
(3, 'Factura de electricidad', 'Servicios', '2025-06-02 00:00:00.000000', 230750, 2),
(4, 'Campaña en redes sociales', 'Publicidad', '2025-06-03 00:00:00.000000', 150000, 2),
(5, 'Viaje a cliente', 'Transporte', '2025-06-03 00:00:00.000000', 80000, 2),
(6, 'Pago mensual', 'Internet', '2025-06-04 00:00:00.000000', 60000, 2),
(7, 'Reparación de equipo', 'Mantenimiento', '2025-06-04 00:00:00.000000', 300000, 2),
(8, 'Licencia anual', 'Software', '2025-06-05 00:00:00.000000', 500000, 2),
(9, 'Pago móvil', 'Telefonía', '2025-06-05 00:00:00.000000', 45000, 2),
(10, 'Café y snacks', 'Suministros', '2025-06-06 00:00:00.000000', 90000, 2),
(11, 'Consultoría externa', 'Asesoría', '2025-06-06 00:00:00.000000', 700000, 2),
(12, 'Curso en línea', 'Formación', '2025-06-07 00:00:00.000000', 199990, 2),
(13, 'Honorarios legales', 'Legal', '2025-06-07 00:00:00.000000', 400000, 2),
(14, 'Aportes a ONG', 'Donaciones', '2025-06-08 00:00:00.000000', 100000, 2),
(15, 'Póliza anual', 'Seguros', '2025-06-08 00:00:00.000000', 950000, 2),
(16, 'Gastos de networking', 'Eventos', '2025-06-09 00:00:00.000000', 300000, 2),
(17, 'Gasto empleado', 'Reembolsos', '2025-06-09 00:00:00.000000', 65000, 2),
(18, 'Compra de hojas', 'Papelería', '2025-06-10 00:00:00.000000', 25000, 2),
(19, 'Compra de herramientas', 'Herramientas', '2025-06-10 00:00:00.000000', 340000, 2),
(20, 'Plantas y cuadros', 'Decoración', '2025-06-11 00:00:00.000000', 120000, 2),
(21, 'Pago impuesto predial para local del negocio.', 'Pago predial', '2025-06-14 00:00:00.000000', 500000, 2),
(22, 'Pago impuesto predial para local del negocio.', 'Adriana Garcia', '2025-06-19 00:00:00.000000', 43334, 2),
(23, 'Pago impuesto predial para local del negocio.', 'Adrian Barrera', '2025-06-01 00:00:00.000000', 3545534, 2),
(24, 'as', 'Angie Duque', '2025-06-12 00:00:00.000000', 3, 2),
(25, 'as', 'Leslie tatiana', '2025-06-15 05:00:00.000000', 2151952, 2);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `spent_seq`
--

CREATE TABLE `spent_seq` (
  `next_val` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `spent_seq`
--

INSERT INTO `spent_seq` (`next_val`) VALUES
(101);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `supplier`
--

CREATE TABLE `supplier` (
  `id` bigint(20) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `supplier_name` varchar(255) DEFAULT NULL,
  `user_id` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `supplier`
--

INSERT INTO `supplier` (`id`, `address`, `email`, `phone`, `supplier_name`, `user_id`) VALUES
(1, 'cra63a #94a-295', 'iqsolaris@gmail.com', '3218854756', 'Fabrica Licores Antioquia', 2),
(2, 'cra63a #94a-295', 'enava@gmail.com', '2344w3', 'Envases S.A.S', 2);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `supplier_seq`
--

CREATE TABLE `supplier_seq` (
  `next_val` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `supplier_seq`
--

INSERT INTO `supplier_seq` (`next_val`) VALUES
(101);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user`
--

CREATE TABLE `user` (
  `id` bigint(20) NOT NULL,
  `address` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `facturation_resolution` bigint(20) NOT NULL,
  `facturation_type` varchar(255) NOT NULL,
  `image` mediumblob DEFAULT NULL,
  `location` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `nit` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `rol` varchar(255) NOT NULL,
  `state` bit(1) NOT NULL,
  `regimen_id` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `user`
--

INSERT INTO `user` (`id`, `address`, `email`, `facturation_resolution`, `facturation_type`, `image`, `location`, `name`, `nit`, `password`, `phone`, `rol`, `state`, `regimen_id`) VALUES
(1, 'N/A', 'admabaga@outlook.com', 1, 'N/A', 0x68747470733a2f2f72616e646f6d757365722e6d652f6170692f706f727472616974732f6d656e2f312e6a7067, 'Medellin, Antioquia', 'Adrian Barrera Garcia', 'N/A', '$2a$10$.9BGniup2SHAKeX0scSAH.x17sggw5V8ro5Aj8YnYEPCZrCguKmG.', '3218854756', 'MASTER', b'1', 1),
(2, 'Cra 68 #89-98', 'tulio@gmail.com', 181, 'POS', 0x2f75706c6f6164732f617661746172732f61336633336363302d383433392d343336312d396339622d3762666433353236646130325f536f6c6169727349636f6e4c696768742e706e67, 'Barbosa, Antioquia', 'Donde Tulio', '9848-9', '$2a$10$YYpOgi0PTrBRUxZqmbbB1ucbaBi4428VkEY6CdCPb95kLlHQ2KrPq', '3218854756', 'ADMIN', b'1', 1);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `account`
--
ALTER TABLE `account`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK7m8ru44m93ukyb61dfxw0apf6` (`user_id`);

--
-- Indices de la tabla `category`
--
ALTER TABLE `category`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `client`
--
ALTER TABLE `client`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FKk1fi84oi1yyuswr40h38kjy1s` (`user_id`);

--
-- Indices de la tabla `product`
--
ALTER TABLE `product`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK1mtsbur82frn64de7balymq9s` (`category_id`),
  ADD KEY `FK979liw4xk18ncpl87u4tygx2u` (`user_id`);

--
-- Indices de la tabla `product_price`
--
ALTER TABLE `product_price`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FKeupemu63ifqfc4txkskyy1hyi` (`product_id`),
  ADD KEY `FK3o6jbbepcro3x3mola48w5p4a` (`user_id`);

--
-- Indices de la tabla `regimen`
--
ALTER TABLE `regimen`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `UK7ax94vwkcfs7ek0kx4eee6p0n` (`description`),
  ADD UNIQUE KEY `UKh7pb140uirrf433hnkh4k8imd` (`name`);

--
-- Indices de la tabla `sale`
--
ALTER TABLE `sale`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FKd9v2kefsda5bh0r2hvo9ke17h` (`account_id`),
  ADD KEY `FKonrcqwf09u6spb6ty6sh11jh5` (`product_id`),
  ADD KEY `FKren9v2mglpdeculj6k54tbced` (`product_price_id`);

--
-- Indices de la tabla `spent`
--
ALTER TABLE `spent`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK79qpap9cc0m33xhnwitg1g57v` (`user_id`);

--
-- Indices de la tabla `supplier`
--
ALTER TABLE `supplier`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK3enptyd0le5havg8fef0gayq9` (`user_id`);

--
-- Indices de la tabla `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `UKob8kqyqqgmefl0aco34akdtpe` (`email`),
  ADD UNIQUE KEY `UKgj2fy3dcix7ph7k8684gka40c` (`name`),
  ADD UNIQUE KEY `UKin9tery7h288ejiotsena4kpl` (`nit`),
  ADD KEY `FKhrfymcnue47nv7wn20kv5v7gl` (`regimen_id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `category`
--
ALTER TABLE `category`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT de la tabla `client`
--
ALTER TABLE `client`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `regimen`
--
ALTER TABLE `regimen`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `spent`
--
ALTER TABLE `spent`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT de la tabla `user`
--
ALTER TABLE `user`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `account`
--
ALTER TABLE `account`
  ADD CONSTRAINT `FK7m8ru44m93ukyb61dfxw0apf6` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`);

--
-- Filtros para la tabla `client`
--
ALTER TABLE `client`
  ADD CONSTRAINT `FKk1fi84oi1yyuswr40h38kjy1s` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`);

--
-- Filtros para la tabla `product`
--
ALTER TABLE `product`
  ADD CONSTRAINT `FK1mtsbur82frn64de7balymq9s` FOREIGN KEY (`category_id`) REFERENCES `category` (`id`),
  ADD CONSTRAINT `FK979liw4xk18ncpl87u4tygx2u` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`);

--
-- Filtros para la tabla `product_price`
--
ALTER TABLE `product_price`
  ADD CONSTRAINT `FK3o6jbbepcro3x3mola48w5p4a` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  ADD CONSTRAINT `FKeupemu63ifqfc4txkskyy1hyi` FOREIGN KEY (`product_id`) REFERENCES `product` (`id`);

--
-- Filtros para la tabla `sale`
--
ALTER TABLE `sale`
  ADD CONSTRAINT `FKd9v2kefsda5bh0r2hvo9ke17h` FOREIGN KEY (`account_id`) REFERENCES `account` (`id`),
  ADD CONSTRAINT `FKonrcqwf09u6spb6ty6sh11jh5` FOREIGN KEY (`product_id`) REFERENCES `product` (`id`),
  ADD CONSTRAINT `FKren9v2mglpdeculj6k54tbced` FOREIGN KEY (`product_price_id`) REFERENCES `product_price` (`id`);

--
-- Filtros para la tabla `spent`
--
ALTER TABLE `spent`
  ADD CONSTRAINT `FK79qpap9cc0m33xhnwitg1g57v` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`);

--
-- Filtros para la tabla `supplier`
--
ALTER TABLE `supplier`
  ADD CONSTRAINT `FK3enptyd0le5havg8fef0gayq9` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`);

--
-- Filtros para la tabla `user`
--
ALTER TABLE `user`
  ADD CONSTRAINT `FKhrfymcnue47nv7wn20kv5v7gl` FOREIGN KEY (`regimen_id`) REFERENCES `regimen` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
