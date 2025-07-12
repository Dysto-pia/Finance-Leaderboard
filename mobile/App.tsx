import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  StyleSheet,
  Text as RNText,
  View as RNView,
  TextInput as RNTextInput,
  ScrollView,
  Button,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const TextInput = RNTextInput as any;
const Text = RNText as any;
const View = RNView as any;
const SafeAreaView = RNSafeAreaView as any;

// Define the type for our navigation routes
type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Dashboard: undefined;
  FinancialEntry: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollView: {
    padding: 20,
  },
  form: {
    padding: 20,
    justifyContent: "center",
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0074d9",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 15,
    padding: 10,
    backgroundColor: "#fff",
  },
  buttonContainer: {
    marginVertical: 15,
  },
  linkText: {
    color: "#0074d9",
    textAlign: "center",
    marginTop: 15,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 10,
    color: "#333",
  },
  cardText: {
    color: "#666",
    fontSize: 16,
  },
  score: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#0074d9",
    textAlign: "center",
  },
});

// Login Screen
const LoginScreen = ({ navigation }: any) => {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>Finance Leaderboard</Text>
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <View style={styles.buttonContainer}>
          <Button
            title="Login"
            onPress={() => navigation.navigate("Dashboard")}
          />
        </View>
        <Text
          style={styles.linkText}
          onPress={() => navigation.navigate("Register")}
        >
          Don't have an account? Register
        </Text>
      </View>
    </View>
  );
};

// Register Screen
const RegisterScreen = ({ navigation }: any) => {
  // Similar to login but for registration
};
