import React from 'react';
import { useSelector } from 'react-redux';
import {
	selectCurrentUser,
	selectCurrentToken,
} from '../features/auth/authSlice';
import { Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

import './styles/Welcome.css';

const Welcome = () => {
	const user = useSelector(selectCurrentUser);
	const token = useSelector(selectCurrentToken);

	let roles = [];
	let userDisplayName = '';
	
	if (token) {
		try {
			const decodedToken = jwtDecode(token);
			roles = decodedToken.UserInfo?.roles || [];
			
			// Extract and format user name from email
			const email = decodedToken.UserInfo?.username || user || '';
			if (email) {
				const [localPart] = email.split('@');
				// Convert matt.w to Matt W
				userDisplayName = localPart
					.split('.')
					.map(part => part.charAt(0).toUpperCase() + part.slice(1))
					.join(' ');
			}
		} catch (error) {
			console.error('Error decoding token:', error);
		}
	}

	const isExternalUser = roles.includes(4);
	const isAdmin = roles.includes(1);
	const isExecutive = roles.includes(2);
	const isManager = roles.includes(3);
	const isProgrammer = roles.includes(7);

	const mainFeatures = [
		{
			icon: '📊',
			title: 'Quota Management',
			description: 'Monitor and manage project quotas in real-time. Track completion rates and make data-driven decisions.',
			link: '/quotas',
			available: true
		},
		...(!isExternalUser ? [{
			icon: '📈',
			title: 'Summary Reports',
			description: 'Get comprehensive insights into project performance, team productivity, and key metrics.',
			link: '/summaryreport',
			available: true
		}] : []),
		{
			icon: '🎯',
			title: 'Project Analytics',
			description: 'Deep dive into individual project performance with detailed analytics and trends.',
			link: '/projectreport',
			available: true
		},
		...((isAdmin || isExecutive || isManager || isProgrammer) ? [{
			icon: '⚡',
			title: 'Production Reports',
			description: 'Monitor real-time production metrics and interviewer performance data.',
			link: '/productionreport',
			available: true
		}] : [])
	];

	const quickActions = [
		...(isAdmin ? [{
			icon: '👥',
			title: 'User Management',
			link: '/userslist'
		}, {
			icon: '🔐',
			title: 'User Roles',
			link: '/updateuserroles'
		}] : []),
		...((isAdmin || isExecutive) ? [{
			icon: '➕',
			title: 'Add User',
			link: '/adduser'
		}] : []),
		...((isAdmin || isExecutive || isManager || isProgrammer) ? [{
			icon: '📋',
			title: 'Publish Quotas',
			link: '/publishquotas'
		}] : []),
		{
			icon: '🐛',
			title: 'Report Issue',
			link: '/github'
		}
	];

	return (
		<div className="welcome-container">
			{/* Hero Section */}
			<div className="welcome-hero">
				<h1>Welcome{userDisplayName ? `, ${userDisplayName}` : ''}!</h1>
				<p>
					Access your dashboard to monitor projects, analyze performance, and manage operations 
					with powerful real-time insights and comprehensive reporting tools.
				</p>
			</div>

			{/* Development Notice */}
			<div className="development-notice">
				🚧 This platform is continuously evolving with new features and improvements
			</div>

			{/* Main Features Grid */}
			<div className="welcome-grid">
				{mainFeatures.map((feature, index) => (
					<div key={index} className="welcome-card">
						<div className="welcome-card-icon">
							{feature.icon}
						</div>
						<h3>{feature.title}</h3>
						<p>{feature.description}</p>
						<Link to={feature.link} className="welcome-card-link">
							Get Started
							<span>→</span>
						</Link>
					</div>
				))}
			</div>

			{/* Quick Actions */}
			{quickActions.length > 0 && (
				<div className="welcome-quick-actions">
					<h2>Quick Actions</h2>
					<div className="quick-actions-grid">
						{quickActions.map((action, index) => (
							<Link key={index} to={action.link} className="quick-action-btn">
								<div className="quick-action-icon">
									{action.icon}
								</div>
								{action.title}
							</Link>
						))}
					</div>
				</div>
			)}

			{/* Support Footer */}
			<div className="welcome-footer">
				<h3>Need Help?</h3>
				<p>
					If you encounter any issues or have suggestions for improvements, 
					we're here to help make your experience better.
				</p>
				<Link to="/github" className="support-link">
					<span>💬</span>
					Submit Feedback
				</Link>
			</div>
		</div>
	);
};

export default Welcome;