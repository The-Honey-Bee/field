import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../../theme/app_theme.dart';

class DualMetricRowWidget extends StatelessWidget {
  const DualMetricRowWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        // Left card — Route progress (adapted from Image 1.2 left card anatomy)
        Expanded(
          child: _GlassMetricCard(
            label: 'Route Progress',
            value: '5',
            unit: '/ 8 stops',
            delta: '+2 vs yesterday',
            deltaPositive: true,
            child: _RouteProgressChart(),
          ),
        ),
        const SizedBox(width: 12),
        // Right card — Pending sync (adapted from Image 1.2 right card anatomy)
        Expanded(
          child: _GlassMetricCard(
            label: 'Pending Sync',
            value: '3',
            unit: 'items',
            delta: '1 delivery log',
            deltaPositive: false,
            child: _SyncGauge(value: 3, max: 10),
          ),
        ),
      ],
    );
  }
}

class _GlassMetricCard extends StatelessWidget {
  final String label;
  final String value;
  final String unit;
  final String delta;
  final bool deltaPositive;
  final Widget child;

  const _GlassMetricCard({
    required this.label,
    required this.value,
    required this.unit,
    required this.delta,
    required this.deltaPositive,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.surfaceDark.withAlpha(179),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF3A5068), width: 0.5),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF8899AA),
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    value,
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.accent,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  ),
                  const SizedBox(width: 4),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text(
                      unit,
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF8899AA),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              SizedBox(height: 48, child: child),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(
                    deltaPositive
                        ? Icons.arrow_upward_rounded
                        : Icons.arrow_downward_rounded,
                    size: 11,
                    color: deltaPositive ? AppTheme.success : AppTheme.warning,
                  ),
                  const SizedBox(width: 3),
                  Text(
                    delta,
                    style: TextStyle(
                      fontSize: 10,
                      color: deltaPositive
                          ? AppTheme.success
                          : AppTheme.warning,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RouteProgressChart extends StatelessWidget {
  const _RouteProgressChart();

  @override
  Widget build(BuildContext context) {
    return LineChart(
      LineChartData(
        gridData: FlGridData(show: false),
        titlesData: FlTitlesData(show: false),
        borderData: FlBorderData(show: false),
        lineTouchData: LineTouchData(enabled: false),
        lineBarsData: [
          LineChartBarData(
            spots: const [
              FlSpot(0, 0),
              FlSpot(1, 1),
              FlSpot(2, 1),
              FlSpot(3, 3),
              FlSpot(4, 4),
              FlSpot(5, 5),
            ],
            isCurved: true,
            curveSmoothness: 0.3,
            color: AppTheme.accent,
            barWidth: 2,
            dotData: FlDotData(show: false),
            belowBarData: BarAreaData(
              show: true,
              gradient: LinearGradient(
                colors: [
                  AppTheme.accent.withAlpha(51),
                  AppTheme.accent.withAlpha(0),
                ],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SyncGauge extends StatelessWidget {
  final int value;
  final int max;

  const _SyncGauge({required this.value, required this.max});

  @override
  Widget build(BuildContext context) {
    final pct = value / max;
    return Center(
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox(
            width: 48,
            height: 48,
            child: CircularProgressIndicator(
              value: pct,
              strokeWidth: 5,
              backgroundColor: const Color(0xFF3A5068),
              valueColor: AlwaysStoppedAnimation<Color>(
                value > 5 ? AppTheme.error : AppTheme.warning,
              ),
            ),
          ),
          Text(
            '$value',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: value > 5 ? AppTheme.error : AppTheme.warning,
            ),
          ),
        ],
      ),
    );
  }
}
