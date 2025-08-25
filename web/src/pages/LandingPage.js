import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  AppBar,
  Toolbar,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  TravelExplore,
  People,
  Security,
  Psychology,
  Star,
  Verified,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const features = [
    {
      icon: <People sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: 'Meet Fellow Travelers',
      description: 'Connect with like-minded travelers worldwide and build meaningful travel relationships.',
    },
    {
      icon: <Psychology sx={{ fontSize: 40, color: theme.palette.secondary.main }} />,
      title: 'AI-Powered Matching',
      description: 'Our intelligent algorithm matches you with compatible travel companions based on your preferences.',
    },
    {
      icon: <Security sx={{ fontSize: 40, color: theme.palette.accent.main }} />,
      title: 'Travel Safely',
      description: 'Advanced safety features including emergency SOS, location sharing, and identity verification.',
    },
    {
      icon: <TravelExplore sx={{ fontSize: 40, color: theme.palette.travel.adventure }} />,
      title: 'Discover Amazing Places',
      description: 'Get personalized recommendations for accommodations, restaurants, and hidden gems.',
    },
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      location: 'New York, USA',
      rating: 5,
      text: 'Travio helped me find the perfect travel companion for my solo trip to Japan. The safety features gave me peace of mind throughout the journey.',
      avatar: 'SJ',
      verified: true,
    },
    {
      name: 'Miguel Rodriguez',
      location: 'Barcelona, Spain',
      rating: 5,
      text: 'The AI matching is incredible! I found travelers with similar interests and budget. Made lifelong friends through this platform.',
      avatar: 'MR',
      verified: true,
    },
    {
      name: 'Priya Patel',
      location: 'Mumbai, India',
      rating: 5,
      text: 'As a female solo traveler, the safety features and verified profiles made me feel secure. Highly recommend Travio!',
      avatar: 'PP',
      verified: true,
    },
  ];

  return (
    <Box>
      {/* Navigation */}
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Travio
          </Typography>
          <Button color="inherit" onClick={() => navigate('/login')}>
            Login
          </Button>
          <Button 
            variant="contained" 
            sx={{ ml: 2 }}
            onClick={() => navigate('/register')}
          >
            Sign Up
          </Button>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          color: 'white',
          py: { xs: 8, md: 12 },
          textAlign: 'center',
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontSize: { xs: '2.5rem', md: '3.5rem' },
              fontWeight: 'bold',
              mb: 3,
            }}
          >
            Meet. Match. Travel.
          </Typography>
          <Typography
            variant="h5"
            sx={{
              mb: 4,
              opacity: 0.9,
              maxWidth: '600px',
              mx: 'auto',
            }}
          >
            Connect with fellow travelers worldwide. Find your perfect travel companion with AI-powered matching and travel safely with advanced safety features.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              sx={{
                bgcolor: 'white',
                color: theme.palette.primary.main,
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                },
              }}
              onClick={() => navigate('/register')}
            >
              Start Your Journey
            </Button>
            <Button
              variant="outlined"
              size="large"
              sx={{
                borderColor: 'white',
                color: 'white',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              Watch Demo
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography
          variant="h2"
          component="h2"
          textAlign="center"
          sx={{ mb: 6, color: theme.palette.text.primary }}
        >
          Why Choose Travio?
        </Typography>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} lg={3} key={index}>
              <Card
                sx={{
                  height: '100%',
                  textAlign: 'center',
                  p: 3,
                  transition: 'transform 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                  },
                }}
              >
                <Box sx={{ mb: 2 }}>
                  {feature.icon}
                </Box>
                <Typography variant="h6" component="h3" sx={{ mb: 2, fontWeight: 'bold' }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Stats Section */}
      <Box sx={{ bgcolor: theme.palette.background.paper, py: 6 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} textAlign="center">
            <Grid item xs={12} md={3}>
              <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                10K+
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Active Travelers
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', color: theme.palette.secondary.main }}>
                50K+
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Successful Matches
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', color: theme.palette.accent.main }}>
                150+
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Countries Covered
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', color: theme.palette.travel.adventure }}>
                4.9★
              </Typography>
              <Typography variant="h6" color="text.secondary">
                User Rating
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Testimonials Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography
          variant="h2"
          component="h2"
          textAlign="center"
          sx={{ mb: 6, color: theme.palette.text.primary }}
        >
          What Travelers Say
        </Typography>
        <Grid container spacing={4}>
          {testimonials.map((testimonial, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card sx={{ height: '100%', p: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: theme.palette.primary.main, mr: 2 }}>
                      {testimonial.avatar}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" component="div">
                          {testimonial.name}
                        </Typography>
                        {testimonial.verified && (
                          <Verified sx={{ fontSize: 16, color: theme.palette.status.verified }} />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {testimonial.location}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', mb: 2 }}>
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} sx={{ color: '#FFD700', fontSize: 20 }} />
                    ))}
                  </Box>
                  <Typography variant="body2">
                    "{testimonial.text}"
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box
        sx={{
          bgcolor: theme.palette.primary.main,
          color: 'white',
          py: 8,
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h3" component="h2" sx={{ mb: 3, fontWeight: 'bold' }}>
            Ready to Start Your Adventure?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            Join thousands of travelers who have found their perfect travel companions through Travio.
          </Typography>
          <Button
            variant="contained"
            size="large"
            sx={{
              bgcolor: 'white',
              color: theme.palette.primary.main,
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.9)',
              },
            }}
            onClick={() => navigate('/register')}
          >
            Join Travio Today
          </Button>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: theme.palette.text.primary, color: 'white', py: 4 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Travio
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Connecting travelers worldwide with AI-powered matching and advanced safety features.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Quick Links
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button color="inherit" sx={{ justifyContent: 'flex-start', p: 0 }}>
                  About Us
                </Button>
                <Button color="inherit" sx={{ justifyContent: 'flex-start', p: 0 }}>
                  Safety
                </Button>
                <Button color="inherit" sx={{ justifyContent: 'flex-start', p: 0 }}>
                  Support
                </Button>
                <Button color="inherit" sx={{ justifyContent: 'flex-start', p: 0 }}>
                  Privacy Policy
                </Button>
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ textAlign: 'center', mt: 4, pt: 4, borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              © 2024 Travio. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;