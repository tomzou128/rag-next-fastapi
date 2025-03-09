"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import HomeIcon from "@mui/icons-material/Home";
import FolderIcon from "@mui/icons-material/Folder";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Link from "next/link";

const DRAWER_WIDTH = 240;
const STORAGE_KEY = "nav_drawer_open";

interface MainNavigationProps {
  children: React.ReactNode;
}

export default function MainNavigation({ children }: MainNavigationProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const pathname = usePathname();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState !== null) setDrawerOpen(JSON.parse(savedState));
    else setDrawerOpen(!isMobile);
  }, [isMobile]);

  // Save drawer state to localStorage whenever it changes
  // Only run after component is mounted
  useEffect(() => {
    if (isMounted) localStorage.setItem(STORAGE_KEY, JSON.stringify(drawerOpen));
  }, [drawerOpen, isMounted]);

  // Navigation links
  const navLinks = [
    { text: "Home", icon: <HomeIcon />, href: "/" },
    { text: "Documents", icon: <FolderIcon />, href: "/documents" },
    { text: "Search & Q&A", icon: <SearchIcon />, href: "/search" },
    // { text: "About", icon: <InfoIcon />, href: "/about" },
  ];

  // Toggle drawer
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  // Drawer content
  const drawer = (
    <Stack>
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: drawerOpen ? "space-between" : "center",
        }}
      >
        {drawerOpen && (<Typography variant="h6" noWrap>RAG Explorer</Typography>)}

        {(!drawerOpen || !isMobile) && (
          <IconButton onClick={handleDrawerToggle} size="small">
            {drawerOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        )}
      </Toolbar>
      <Divider />
      <List>
        {navLinks.map((link) => (
          <ListItem key={link.text} disablePadding>
            <ListItemButton
              component={Link}
              href={link.href}
              onClick={isMobile ? handleDrawerToggle : undefined}
              selected={pathname === link.href}
              sx={{
                minHeight: 48,
                justifyContent: drawerOpen ? "initial" : "center",
                px: 2.5,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: drawerOpen ? 3 : 0,
                  justifyContent: "center",
                }}
              >
                <Tooltip title={!drawerOpen ? link.text : ""} placement="right" arrow>
                  {link.icon}
                </Tooltip>
              </ListItemIcon>
              {drawerOpen && <ListItemText primary={link.text} />}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Stack>
  );

  // Calculate main content width based on drawer state
  const getMainContentWidth = () => {
    if (isMobile) return "100%";
    return drawerOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : `calc(100% - ${theme.spacing(7)})`;
  };

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{
          width: getMainContentWidth(),
          ml: isMobile ? 0 : drawerOpen ? `${DRAWER_WIDTH}px` : theme.spacing(7),
          transition: theme.transitions.create(["width", "margin"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: "none" } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap>
              RAG Document Explorer
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: isMobile ? 0 : (drawerOpen ? DRAWER_WIDTH : theme.spacing(7)),
          flexShrink: 0,
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={isMobile && drawerOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer - can be mini or full width */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerOpen ? DRAWER_WIDTH : theme.spacing(7),
              overflowX: "hidden",
              transition: theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            },
          }}
          open={drawerOpen}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          width: getMainContentWidth(),
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Toolbar /> {/* Spacer to push content below AppBar */}
        {children}
      </Box>
    </Box>
  );
}
