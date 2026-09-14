import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../../theme/app_theme.dart';

class PrimaryChartCardWidget extends StatefulWidget {
  const PrimaryChartCardWidget({super.key});

  @override
  State<PrimaryChartCardWidget> createState() => _PrimaryChartCardWidgetState();
}

class _PrimaryChartCardWidgetState extends State<PrimaryChartCardWidget> {
  // TODO: Replace with [Riverpod/Bloc] for production
  String _selectedPeriod = 'Weekly';
  final List<String> _periods = ['Daily', 'Weekly', 'Monthly'];

  // Adapted from Image 2.2 PrimaryChartCard anatomy
  // Bar chart: title + period selector + trend badge + bar chart
  final Map<String, List<double>> _chartData = {
    'Daily': [4, 6, 5, 7, 5, 8, 3],
    'Weekly': [28, 35, 30, 42, 38, 45, 32],
    'Monthly': [120, 145, 132, 168, 155, 178, 141],
  };

  final List<String> _labels = [
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun',
  ];

  @override
  Widget build(BuildContext context) {
    final data = _chartData[_selectedPeriod]!;
    final maxVal = data.reduce((a, b) => a > b ? a : b);

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
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Deliveries Completed',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _selectedPeriod == 'Daily'
                              ? 'stops/day'
                              : _selectedPeriod == 'Weekly'
                              ? 'stops/week'
                              : 'stops/month',
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFF8899AA),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Period selector dropdown
                  GestureDetector(
                    onTap: () => _showPeriodPicker(context),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: AppTheme.surfaceVariantDark,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: const Color(0xFF3A5068),
                          width: 0.5,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            _selectedPeriod,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(
                            Icons.keyboard_arrow_down_rounded,
                            size: 14,
                            color: Color(0xFF8899AA),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              // Trend badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.success.withAlpha(31),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.arrow_upward_rounded,
                      size: 11,
                      color: AppTheme.success,
                    ),
                    const SizedBox(width: 3),
                    Text(
                      '+18% vs last period',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.success,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              // Bar chart
              SizedBox(
                height: 120,
                child: BarChart(
                  BarChartData(
                    alignment: BarChartAlignment.spaceAround,
                    maxY: maxVal * 1.3,
                    barTouchData: BarTouchData(
                      touchTooltipData: BarTouchTooltipData(
                        tooltipBgColor: AppTheme.surfaceElevatedDark,
                        tooltipRoundedRadius: 8,
                        getTooltipItem: (group, groupIndex, rod, rodIndex) {
                          return BarTooltipItem(
                            '${rod.toY.toInt()}',
                            const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                              fontSize: 12,
                            ),
                          );
                        },
                      ),
                    ),
                    titlesData: FlTitlesData(
                      show: true,
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          getTitlesWidget: (value, meta) {
                            final idx = value.toInt();
                            if (idx < 0 || idx >= _labels.length) {
                              return const SizedBox.shrink();
                            }
                            return Text(
                              _labels[idx],
                              style: const TextStyle(
                                fontSize: 10,
                                color: Color(0xFF8899AA),
                              ),
                            );
                          },
                          reservedSize: 22,
                        ),
                      ),
                      leftTitles: AxisTitles(
                        sideTitles: SideTitles(showTitles: false),
                      ),
                      topTitles: AxisTitles(
                        sideTitles: SideTitles(showTitles: false),
                      ),
                      rightTitles: AxisTitles(
                        sideTitles: SideTitles(showTitles: false),
                      ),
                    ),
                    gridData: FlGridData(
                      show: true,
                      drawVerticalLine: false,
                      horizontalInterval: maxVal / 3,
                      getDrawingHorizontalLine: (_) => FlLine(
                        color: const Color(0xFF3A5068),
                        strokeWidth: 0.5,
                        dashArray: [4, 4],
                      ),
                    ),
                    borderData: FlBorderData(show: false),
                    barGroups: List.generate(data.length, (i) {
                      final isToday = i == 6;
                      return BarChartGroupData(
                        x: i,
                        barRods: [
                          BarChartRodData(
                            toY: data[i],
                            color: isToday
                                ? AppTheme.accent
                                : AppTheme.accent.withAlpha(89),
                            width: 18,
                            borderRadius: const BorderRadius.only(
                              topLeft: Radius.circular(5),
                              topRight: Radius.circular(5),
                            ),
                          ),
                        ],
                      );
                    }),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showPeriodPicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.surfaceDark,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: _periods.map((p) {
            final isSelected = p == _selectedPeriod;
            return ListTile(
              title: Text(
                p,
                style: TextStyle(
                  color: isSelected ? AppTheme.accent : Colors.white,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                ),
              ),
              trailing: isSelected
                  ? Icon(Icons.check_rounded, color: AppTheme.accent, size: 20)
                  : null,
              onTap: () {
                setState(() => _selectedPeriod = p);
                Navigator.pop(context);
              },
            );
          }).toList(),
        ),
      ),
    );
  }
}