import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/app_theme.dart';
import './custom_icon_widget.dart';

class _TabSpec {
  final String label;
  final String icon;
  final String activeIcon;
  final int? branchIndex;

  const _TabSpec({
    required this.label,
    required this.icon,
    required this.activeIcon,
    this.branchIndex,
  });
}

class AppNavigation extends StatefulWidget {
  final StatefulNavigationShell navigationShell;

  const AppNavigation({required this.navigationShell, super.key});

  @override
  State<AppNavigation> createState() => _AppNavigationState();
}

class _AppNavigationState extends State<AppNavigation> {
  int _selectedVisualIndex = 0;

  static const List<_TabSpec> _tabs = [
    _TabSpec(
      label: 'Home',
      icon: 'home_outlined',
      activeIcon: 'home',
      branchIndex: 0,
    ),
    _TabSpec(
      label: 'Orders',
      icon: 'receipt_long_outlined',
      activeIcon: 'receipt_long',
      branchIndex: 1,
    ),
    _TabSpec(
      label: 'Report',
      icon: 'assignment_outlined',
      activeIcon: 'assignment',
      branchIndex: 2,
    ),
    _TabSpec(
      label: 'Supervisor',
      icon: 'supervisor_account',
      activeIcon: 'supervisor_account',
      branchIndex: 3,
    ),
    _TabSpec(
      label: 'Messages',
      icon: 'chat_bubble_outline',
      activeIcon: 'chat_bubble',
      branchIndex: 4,
    ),
    _TabSpec(
      label: 'Analytics',
      icon: 'bar_chart',
      activeIcon: 'bar_chart',
      branchIndex: 5,
    ),
    _TabSpec(
      label: 'Account',
      icon: 'person_outline',
      activeIcon: 'person',
      branchIndex: 6,
    ),
    _TabSpec(
      label: 'Activity',
      icon: 'history',
      activeIcon: 'history',
      branchIndex: 7,
    ),
  ];

  void _onTabTap(int visualIndex) {
    final tab = _tabs[visualIndex];
    if (tab.branchIndex == null) return;

    setState(() => _selectedVisualIndex = visualIndex);
    widget.navigationShell.goBranch(
      tab.branchIndex!,
      initialLocation: tab.branchIndex == widget.navigationShell.currentIndex,
    );
  }

  @override
  void didUpdateWidget(AppNavigation oldWidget) {
    super.didUpdateWidget(oldWidget);
    for (int i = 0; i < _tabs.length; i++) {
      if (_tabs[i].branchIndex == widget.navigationShell.currentIndex) {
        _selectedVisualIndex = i;
        break;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final safeBottom = MediaQuery.of(context).padding.bottom;

    return ClipRRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          height: 64 + safeBottom,
          decoration: BoxDecoration(
            color: AppTheme.surfaceDark.withAlpha(191),
            border: const Border(
              top: BorderSide(color: Color(0xFF3A5068), width: 0.5),
            ),
          ),
          child: SafeArea(
            top: false,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const NeverScrollableScrollPhysics(),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: List.generate(_tabs.length, (i) {
                  final tab = _tabs[i];
                  final isActive = i == _selectedVisualIndex;
                  final isStub = tab.branchIndex == null;
                  final opacity = isStub ? 0.4 : 1.0;

                  return Opacity(
                    opacity: opacity,
                    child: GestureDetector(
                      onTap: () => _onTabTap(i),
                      behavior: HitTestBehavior.opaque,
                      child: SizedBox(
                        width: 52,
                        height: 56,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              curve: Curves.easeOutCubic,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: isActive
                                    ? AppTheme.accent.withAlpha(46)
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: CustomIconWidget(
                                iconName: isActive ? tab.activeIcon : tab.icon,
                                color: isActive
                                    ? AppTheme.accent
                                    : const Color(0xFF8899AA),
                                size: 20,
                              ),
                            ),
                            const SizedBox(height: 2),
                            AnimatedDefaultTextStyle(
                              duration: const Duration(milliseconds: 200),
                              style: TextStyle(
                                fontSize: 8,
                                fontWeight: isActive
                                    ? FontWeight.w600
                                    : FontWeight.w400,
                                color: isActive
                                    ? AppTheme.accent
                                    : const Color(0xFF8899AA),
                              ),
                              child: Text(tab.label),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
