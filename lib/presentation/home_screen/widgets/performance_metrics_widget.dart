// Performance Metrics Widget
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../theme/app_theme.dart';

/// Displays performance metrics passed from the HomeScreen.
class PerformanceMetricsWidget extends StatelessWidget {
  final int todayOrders;
  final double todayRevenue;
  final int apiLatencyMs;
  final int realtimeLagMs;
  final double fps;

  const PerformanceMetricsWidget({
    super.key,
    required this.todayOrders,
    required this.todayRevenue,
    required this.apiLatencyMs,
    required this.realtimeLagMs,
    required this.fps,
  });

  Widget _metricItem(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppTheme.surfaceDark.withAlpha(150),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFF3A5068), width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: GoogleFonts.ibmPlexSans(
                fontSize: 11, color: const Color(0xFF8899AA)),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: GoogleFonts.ibmPlexSans(
                fontSize: 14, fontWeight: FontWeight.w600, color: color),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Performance Metrics',
          style: GoogleFonts.ibmPlexSans(
              fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            _metricItem('Orders', '\${todayOrders}', AppTheme.accent),
            _metricItem('Revenue', 'TZS \${todayRevenue.toStringAsFixed(0)}',
                AppTheme.success),
            _metricItem('FPS', fps.toStringAsFixed(1), AppTheme.accent),
            _metricItem('API Latency', '\${apiLatencyMs} ms', AppTheme.warning),
            _metricItem('Realtime Lag', '\${realtimeLagMs} ms', AppTheme.warning),
          ],
        ),
      ],
    );
  }
}
