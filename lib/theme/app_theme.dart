// THEME LOCK: dark — source: domain signal (field ops, monitoring dashboard)
// Scaffold.backgroundColor = AppTheme.background — ALL screens

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // ZamZam Brand colors
  static const Color primary = Color(0xFF006B3C); // ZamZam deep green
  static const Color primaryLight = Color(0xFF008F50); // ZamZam medium green
  static const Color accent = Color(0xFF00C46A); // ZamZam bright green
  static const Color accentMuted = Color(0x4D00C46A);

  // Semantic colors
  static const Color success = Color(0xFF22C55E);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);
  static const Color info = Color(0xFF3B82F6);

  // Dark surfaces
  static const Color backgroundDark = Color(
    0xFF0A1A0F,
  ); // Very dark green-black
  static const Color surfaceDark = Color(0xFF122010); // Dark green surface
  static const Color surfaceVariantDark = Color(0xFF1A2E1C); // Slightly lighter
  static const Color surfaceElevatedDark = Color(
    0xFF223A24,
  ); // Elevated surface

  // Light surfaces (required getter)
  static const Color backgroundLight = Color(0xFFF0F7F2);
  static const Color surfaceLight = Color(0xFFFFFFFF);

  static ThemeData get lightTheme => ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.light(
      primary: primary,
      onPrimary: Colors.white,
      primaryContainer: const Color(0xFFD0F0E0),
      onPrimaryContainer: const Color(0xFF002A18),
      secondary: accent,
      onSecondary: Colors.white,
      surface: surfaceLight,
      onSurface: const Color(0xFF1A1A1A),
      error: error,
      onError: Colors.white,
      outline: const Color(0xFFCCCCCC),
      outlineVariant: const Color(0xFFEEEEEE),
    ),
    scaffoldBackgroundColor: backgroundLight,
    textTheme: GoogleFonts.ibmPlexSansTextTheme(ThemeData.light().textTheme),
    appBarTheme: AppBarThemeData(
      backgroundColor: surfaceLight,
      elevation: 0,
      scrolledUnderElevation: 1,
      titleTextStyle: GoogleFonts.ibmPlexSans(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: const Color(0xFF1A1A1A),
      ),
    ),
  );

  static ThemeData get darkTheme => ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.dark(
      primary: accent,
      onPrimary: backgroundDark,
      primaryContainer: primaryLight,
      onPrimaryContainer: Colors.white,
      secondary: accent,
      onSecondary: backgroundDark,
      secondaryContainer: const Color(0xFF004D28),
      onSecondaryContainer: const Color(0xFFB3FFD9),
      surface: surfaceDark,
      onSurface: const Color(0xFFE2F0E8),
      surfaceContainerHighest: surfaceVariantDark,
      error: error,
      onError: Colors.white,
      outline: const Color(0xFF2A5038),
      outlineVariant: const Color(0xFF1A2E1C),
      inverseSurface: const Color(0xFFE2F0E8),
      onInverseSurface: backgroundDark,
    ),
    scaffoldBackgroundColor: backgroundDark,
    textTheme: GoogleFonts.ibmPlexSansTextTheme(ThemeData.dark().textTheme)
        .copyWith(
          displayLarge: GoogleFonts.ibmPlexSans(
            fontSize: 36,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
          displayMedium: GoogleFonts.ibmPlexSans(
            fontSize: 28,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
          titleLarge: GoogleFonts.ibmPlexSans(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
          titleMedium: GoogleFonts.ibmPlexSans(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
          titleSmall: GoogleFonts.ibmPlexSans(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: const Color(0xFFE2F0E8),
          ),
          bodyLarge: GoogleFonts.ibmPlexSans(
            fontSize: 15,
            fontWeight: FontWeight.w400,
            color: const Color(0xFFE2F0E8),
          ),
          bodyMedium: GoogleFonts.ibmPlexSans(
            fontSize: 13,
            fontWeight: FontWeight.w400,
            color: const Color(0xFFB0D4BC),
          ),
          bodySmall: GoogleFonts.ibmPlexSans(
            fontSize: 11,
            fontWeight: FontWeight.w400,
            color: const Color(0xFF88AA94),
          ),
          labelLarge: GoogleFonts.ibmPlexSans(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Colors.white,
            letterSpacing: 0.2,
          ),
          labelMedium: GoogleFonts.ibmPlexSans(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: const Color(0xFFB0D4BC),
          ),
          labelSmall: GoogleFonts.ibmPlexSans(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: const Color(0xFF88AA94),
            letterSpacing: 0.3,
          ),
        ),
    appBarTheme: AppBarThemeData(
      backgroundColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      titleTextStyle: GoogleFonts.ibmPlexSans(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: Colors.white,
      ),
      iconTheme: const IconThemeData(color: Colors.white),
    ),
    cardTheme: CardThemeData(
      color: surfaceDark,
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
    inputDecorationTheme: InputDecorationThemeData(
      filled: true,
      fillColor: surfaceVariantDark,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: const Color(0xFF2A5038)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF2A5038), width: 1),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: accent, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: error, width: 1),
      ),
      labelStyle: GoogleFonts.ibmPlexSans(
        color: const Color(0xFF88AA94),
        fontSize: 14,
      ),
      hintStyle: GoogleFonts.ibmPlexSans(
        color: const Color(0xFF88AA94),
        fontSize: 14,
      ),
    ),
    dividerTheme: const DividerThemeData(
      color: Color(0xFF1A2E1C),
      thickness: 1,
    ),
    iconTheme: const IconThemeData(color: Color(0xFFB0D4BC)),
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: accent,
      foregroundColor: backgroundDark,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
  );
}
